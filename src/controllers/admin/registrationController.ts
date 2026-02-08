import { Response } from 'express';
import XLSX from 'xlsx';
import { CustomRequest } from '../../types/common';
import { Registration, Course, Participant } from '../../models';
import { paginate, formatResponse } from '../../utils/helpers';
import { AppError, asyncHandler } from '../../middleware/errorHandler';
import mongoose from 'mongoose';

/**
 * Get All Registrations
 */
export const getAllRegistrations = asyncHandler(async (req: CustomRequest, res: Response) => {
  const {
    page = 1,
    limit = 10,
    courseId,
    status,
    paymentStatus,
    search,
  } = req.query;

  const filters: any = {};

  if (courseId) {
    filters.courseId = new mongoose.Types.ObjectId(courseId as string);
  }

  if (status) {
    filters.registrationStatus = { $regex: status, $options: 'i' };
  }

  if (paymentStatus) {
    filters.paymentStatus = { $regex: paymentStatus, $options: 'i' };
  }

  if (search) {
    const participantIds = await Participant.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ],
    }).select('_id');

    const courseIds = await Course.find({
      courseName: { $regex: search, $options: 'i' },
    }).select('_id');

    filters.$or = [
      { participantId: { $in: participantIds.map((p) => p._id) } },
      { courseId: { $in: courseIds.map((c) => c._id) } },
    ];
  }

  const { skip, limit: pageLimit, page: pageNum } = paginate(
    parseInt(page as string),
    parseInt(limit as string)
  );

  const registrations = await Registration.find(filters)
    .populate('courseId', 'courseName courseId')
    .populate('participantId', 'name email mobile')
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
export const getRegistrationDetail = asyncHandler(async (req: CustomRequest, res: Response) => {
  const registration = await Registration.findById(req.params.registrationId)
    .populate('courseId')
    .populate('participantId');

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
 * Update Registration Status
 */
export const updateRegistrationStatus = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const { status, notes } = req.body;

    if (!status) {
      throw new AppError(400, 'Status is required');
    }

    const validStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new AppError(400, 'Invalid status');
    }

    const registration = await Registration.findByIdAndUpdate(
      req.params.registrationId,
      {
        registrationStatus: status,
        ...(notes && { adminNotes: notes }),
      },
      { new: true, runValidators: true }
    );

    if (!registration) {
      throw new AppError(404, 'Registration not found');
    }

    const response = formatResponse(
      true,
      registration,
      'Registration status updated successfully',
      200
    );

    res.status(200).json(response);
  }
);

/**
 * Cancel Registration
 */
export const cancelUserRegistration = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { reason } = req.body;

  const registration = await Registration.findById(req.params.registrationId);

  if (!registration) {
    throw new AppError(404, 'Registration not found');
  }

  if (registration.registrationStatus === 'CANCELLED') {
    throw new AppError(400, 'Registration is already cancelled');
  }

  registration.registrationStatus = 'CANCELLED';
  registration.cancellationReason = reason || 'Cancelled by admin';
  registration.cancellationDate = new Date();

  if (registration.paymentStatus === 'PAID') {
    registration.paymentStatus = 'REFUNDED';
  }

  await registration.save();

  const response = formatResponse(true, null, 'Registration cancelled successfully', 200);

  res.status(200).json(response);
});

/**
 * Issue Certificate
 */
export const issueCertificate = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { certificateUrl, certificateName } = req.body;

  if (!certificateUrl || !certificateName) {
    throw new AppError(400, 'Certificate URL and name are required');
  }

  const registration = await Registration.findByIdAndUpdate(
    req.params.registrationId,
    {
      certificateIssued: true,
      certificate: {
        url: certificateUrl,
        fileName: certificateName,
        issuedDate: new Date(),
      },
    },
    { new: true }
  );

  if (!registration) {
    throw new AppError(404, 'Registration not found');
  }

  const response = formatResponse(
    true,
    registration,
    'Certificate issued successfully',
    200
  );

  res.status(200).json(response);
});

/**
 * Get Payment Details
 */
export const getPaymentDetails = asyncHandler(async (req: CustomRequest, res: Response) => {
  const registration = await Registration.findById(req.params.registrationId);

  if (!registration) {
    throw new AppError(404, 'Registration not found');
  }

  const paymentDetails = {
    registrationNumber: registration.registrationNumber,
    originalPrice: registration.originalPrice,
    discountApplied: registration.discountApplied,
    discountType: registration.discountType,
    finalAmount: registration.finalAmount,
    amountPaid: registration.amountPaid,
    paymentMode: registration.paymentMode,
    paymentStatus: registration.paymentStatus,
    paymentId: registration.paymentId,
    transactionDate: registration.transactionDate,
    currency: registration.currency,
  };

  const response = formatResponse(
    true,
    paymentDetails,
    'Payment details retrieved successfully',
    200
  );

  res.status(200).json(response);
});

/**
 * Get Dashboard Statistics
 */
export const getDashboardStats = asyncHandler(async (req: CustomRequest, res: Response) => {
  const totalCourses = await Course.countDocuments();
  const activeCourses = await Course.countDocuments({ isActive: true });
  const totalRegistrations = await Registration.countDocuments();
  const confirmedRegistrations = await Registration.countDocuments({
    registrationStatus: 'CONFIRMED',
  });
  const paidRegistrations = await Registration.countDocuments({ paymentStatus: 'PAID' });
  const totalParticipants = await Participant.countDocuments();

  const revenueData = await Registration.aggregate([
    { $match: { paymentStatus: 'PAID' } },
    { $group: { _id: null, totalRevenue: { $sum: '$finalAmount' } } },
  ]);

  const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

  const coursesByType = await Course.aggregate([
    {
      $group: {
        _id: '$serviceType',
        value: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        name: { $ifNull: ['$_id', 'Other'] },
        value: 1,
      },
    },
    { $sort: { value: -1, name: 1 } },
  ]);

  const stats = {
    courses: {
      total: totalCourses,
      active: activeCourses,
      inactive: totalCourses - activeCourses,
    },
    registrations: {
      total: totalRegistrations,
      confirmed: confirmedRegistrations,
      pending: totalRegistrations - confirmedRegistrations,
    },
    payments: {
      total: paidRegistrations,
      totalRevenue,
    },
    participants: {
      total: totalParticipants,
    },
    coursesByType,
  };

  const response = formatResponse(true, stats, 'Dashboard statistics retrieved successfully', 200);

  res.status(200).json(response);
});

/**
 * Export Registrations to Excel
 */
export const exportRegistrations = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { startDate, endDate, status, paymentStatus, search, courseId } = req.query;

  const filters: any = {};

  if (courseId) {
    filters.courseId = new mongoose.Types.ObjectId(courseId as string);
  }

  if (status) {
    filters.registrationStatus = { $regex: status, $options: 'i' };
  }

  if (paymentStatus) {
    filters.paymentStatus = { $regex: paymentStatus, $options: 'i' };
  }

  if (startDate || endDate) {
    filters.createdAt = {};
    if (startDate) {
      filters.createdAt.$gte = new Date(startDate as string);
    }
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      filters.createdAt.$lte = end;
    }
  }

  if (search) {
    const participantIds = await Participant.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ],
    }).select('_id');

    const courseIds = await Course.find({
      courseName: { $regex: search, $options: 'i' },
    }).select('_id');

    filters.$or = [
      { participantId: { $in: participantIds.map((p) => p._id) } },
      { courseId: { $in: courseIds.map((c) => c._id) } },
    ];
  }

  const registrations = await Registration.find(filters)
    .populate('courseId', 'courseName courseId serviceType')
    .populate('participantId', 'name email mobile organization designation')
    .sort({ createdAt: -1 });

  const data = registrations.map((reg: any) => ({
    'Registration ID': reg.registrationNumber,
    'Participant Name': reg.participantId?.name || 'N/A',
    'Email': reg.participantId?.email || 'N/A',
    'Mobile': reg.participantId?.mobile || 'N/A',
    'Course Name': reg.courseId?.courseName || 'N/A',
    'Course ID': reg.courseId?.courseId || 'N/A',
    'Service Type': reg.courseId?.serviceType || 'N/A',
    'Registration Status': reg.registrationStatus,
    'Payment Status': reg.paymentStatus,
    'Amount Paid': reg.amountPaid,
    'Total Amount': reg.finalAmount,
    'Currency': reg.currency,
    'Payment Mode': reg.paymentMode || 'N/A',
    'Payment ID': reg.paymentId || 'N/A',
    'Registration Date': reg.createdAt ? new Date(reg.createdAt).toLocaleDateString() : 'N/A',
    'Cancellation Reason': reg.cancellationReason || 'N/A',
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');

  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename=Registrations.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(excelBuffer);
});
