import { Response } from 'express';
import { CustomRequest } from '../../types/common';
import { Registration, Participant, Course } from '../../models';
import { paginate, formatResponse } from '../../utils/helpers';
import { AppError, asyncHandler } from '../../middleware/errorHandler';
import mongoose from 'mongoose';

/**
 * Register for Course
 */
export const registerForCourse = asyncHandler(async (req: CustomRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'User not authenticated');
  }

  const { courseId } = req.body;

  if (!courseId) {
    throw new AppError(400, 'Course ID is required');
  }

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw new AppError(400, 'Invalid course ID');
  }

  const course = await Course.findById(courseId);

  if (!course) {
    throw new AppError(404, 'Course not found');
  }

  if (!course.isActive) {
    throw new AppError(400, 'Course is not available');
  }

  if (new Date() > course.endDate) {
    throw new AppError(400, 'Course has already ended');
  }

  const participant = await Participant.findById(req.user.id);

  if (!participant) {
    throw new AppError(404, 'Participant not found');
  }

  const existingRegistration = await Registration.findOne({
    participantId: req.user.id,
    courseId: courseId,
    registrationStatus: { $ne: 'CANCELLED' },
  });

  if (existingRegistration) {
    throw new AppError(400, 'You are already registered for this course');
  }

  const registration = new Registration({
    participantId: req.user.id,
    courseId: courseId,
    originalPrice: course.finalPrice,
    finalAmount: course.finalPrice,
    discountApplied: course.discountPercentage,
    registrationStatus: 'PENDING',
    paymentStatus: 'PENDING',
  });

  await registration.save();

  participant.registeredCourses.push({
    courseId: new mongoose.Types.ObjectId(courseId),
    registrationId: registration._id,
    registrationDate: new Date(),
  });

  course.enrollmentCount = (course.enrollmentCount || 0) + 1;
  if (course.capacityRemaining) {
    course.capacityRemaining -= 1;
  }

  await Promise.all([participant.save(), course.save()]);

  const response = formatResponse(
    true,
    registration,
    'Registration successful. Please proceed to payment.',
    201
  );

  res.status(201).json(response);
});

/**
 * Get User Registrations
 */
export const getUserRegistrations = asyncHandler(async (req: CustomRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'User not authenticated');
  }

  const { page = 1, limit = 10, status } = req.query;

  const filters: any = { participantId: req.user.id };

  if (status) {
    filters.registrationStatus = status;
  }

  const { skip, limit: pageLimit, page: pageNum } = paginate(
    parseInt(page as string),
    parseInt(limit as string)
  );

  const registrations = await Registration.find(filters)
    .populate('courseId', 'courseName courseId serviceType startDate endDate price finalPrice')
    .skip(skip)
    .limit(pageLimit)
    .sort({ createdAt: -1 });

  const total = await Registration.countDocuments(filters);

  const response = formatResponse(
    true,
    {
      registrations,
      pagination: {
        page: pageNum,
        limit: pageLimit,
        total,
        pages: Math.ceil(total / pageLimit),
      },
    },
    'Registrations retrieved successfully',
    200
  );

  res.status(200).json(response);
});

/**
 * Get Registration Details
 */
export const getRegistrationDetails = asyncHandler(async (req: CustomRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'User not authenticated');
  }

  const registration = await Registration.findOne({
    _id: req.params.registrationId,
    participantId: req.user.id,
  })
    .populate('courseId')
    .populate('participantId', 'name email mobile');

  if (!registration) {
    throw new AppError(404, 'Registration not found');
  }

  const response = formatResponse(
    true,
    registration,
    'Registration details retrieved successfully',
    200
  );

  res.status(200).json(response);
});

/**
 * Process Payment
 */
export const processPayment = asyncHandler(async (req: CustomRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'User not authenticated');
  }

  const { paymentMode, paymentId, amountPaid } = req.body;

  if (!paymentMode || !paymentId || !amountPaid) {
    throw new AppError(400, 'Payment details are required');
  }

  const registration = await Registration.findOne({
    _id: req.params.registrationId,
    participantId: req.user.id,
  });

  if (!registration) {
    throw new AppError(404, 'Registration not found');
  }

  if (registration.paymentStatus === 'PAID') {
    throw new AppError(400, 'Payment already processed');
  }

  if (amountPaid < registration.finalAmount) {
    throw new AppError(400, 'Insufficient payment amount');
  }

  registration.paymentMode = paymentMode as any;
  registration.paymentId = paymentId;
  registration.amountPaid = amountPaid;
  registration.paymentStatus = 'PAID';
  registration.registrationStatus = 'CONFIRMED';
  registration.transactionDate = new Date();

  await registration.save();

  const response = formatResponse(
    true,
    registration,
    'Payment processed successfully. Registration confirmed!',
    200
  );

  res.status(200).json(response);
});

/**
 * Submit Review
 */
export const submitReview = asyncHandler(async (req: CustomRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'User not authenticated');
  }

  const { rating, review } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    throw new AppError(400, 'Rating must be between 1 and 5');
  }

  const registration = await Registration.findOne({
    _id: req.params.registrationId,
    participantId: req.user.id,
  });

  if (!registration) {
    throw new AppError(404, 'Registration not found');
  }

  if (!registration.courseCompleted) {
    throw new AppError(400, 'You can only review after completing the course');
  }

  registration.rating = rating;
  registration.review = review || '';

  await registration.save();

  const response = formatResponse(true, registration, 'Review submitted successfully', 200);

  res.status(200).json(response);
});

/**
 * Cancel Registration
 */
export const cancelRegistration = asyncHandler(async (req: CustomRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'User not authenticated');
  }

  const { reason } = req.body;

  const registration = await Registration.findOne({
    _id: req.params.registrationId,
    participantId: req.user.id,
  });

  if (!registration) {
    throw new AppError(404, 'Registration not found');
  }

  if (registration.registrationStatus === 'CANCELLED') {
    throw new AppError(400, 'Registration is already cancelled');
  }

  const course = await Course.findById(registration.courseId);
  if (course && new Date() > course.startDate) {
    throw new AppError(400, 'Cannot cancel course after it has started');
  }

  registration.registrationStatus = 'CANCELLED';
  registration.cancellationReason = reason || 'Cancelled by participant';
  registration.cancellationDate = new Date();

  if (registration.paymentStatus === 'PAID') {
    registration.paymentStatus = 'REFUNDED';
  }

  await registration.save();

  await Participant.findByIdAndUpdate(req.user.id, {
    $pull: { registeredCourses: { registrationId: registration._id } },
  });

  if (course) {
    await Course.findByIdAndUpdate(registration.courseId, {
      $inc: { enrollmentCount: -1 },
      ...(course.capacityRemaining && { capacityRemaining: course.capacityRemaining + 1 }),
    });
  }

  const response = formatResponse(true, null, 'Registration cancelled successfully', 200);

  res.status(200).json(response);
});

/**
 * Download Certificate
 */
export const downloadCertificate = asyncHandler(async (req: CustomRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'User not authenticated');
  }

  const registration = await Registration.findOne({
    _id: req.params.registrationId,
    participantId: req.user.id,
  });

  if (!registration) {
    throw new AppError(404, 'Registration not found');
  }

  if (!registration.certificateIssued) {
    throw new AppError(400, 'Certificate not yet issued');
  }

  const response = formatResponse(
    true,
    registration.certificate,
    'Certificate ready for download',
    200
  );

  res.status(200).json(response);
});
