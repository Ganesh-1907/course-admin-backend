import { Response } from 'express';
import { CustomRequest } from '../../types/common';
import { Course, Registration } from '../../models';
import { paginate, formatResponse } from '../../utils/helpers';
import { AppError, asyncHandler } from '../../middleware/errorHandler';
import mongoose from 'mongoose';

/**
 * Get All Courses (Public)
 */
export const getAllCourses = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { page = 1, limit = 10, search, serviceType } = req.query;

  const filters: any = { isActive: true };

  if (search) {
    filters.$or = [
      { courseName: { $regex: search, $options: 'i' } },
      { mentor: { $regex: search, $options: 'i' } },
    ];
  }

  if (serviceType && serviceType !== 'All Types') {
    filters.serviceType = serviceType;
  }

  const { skip, limit: pageLimit, page: pageNum } = paginate(
    parseInt(page as string),
    parseInt(limit as string)
  );

  const courses = await Course.find(filters)
    .select(
      'courseId courseName description mentor serviceType startDate endDate price discountPercentage finalPrice courseImage enrollmentCount'
    )
    .skip(skip)
    .limit(pageLimit)
    .sort({ startDate: 1 });

  const total = await Course.countDocuments(filters);

  const response = formatResponse(
    true,
    {
      courses,
      pagination: {
        page: pageNum,
        limit: pageLimit,
        total,
        pages: Math.ceil(total / pageLimit),
      },
    },
    'Courses retrieved successfully',
    200
  );

  res.status(200).json(response);
});

/**
 * Get Course Details
 */
export const getCourseDetails = asyncHandler(async (req: CustomRequest, res: Response) => {
  const course = await Course.findOne({
    $or: [{ _id: req.params.courseId }, { courseId: req.params.courseId }],
    isActive: true,
  }).populate('createdBy', 'name');

  if (!course) {
    throw new AppError(404, 'Course not found');
  }

  const registrationCount = await Registration.countDocuments({
    courseId: course._id,
    registrationStatus: 'CONFIRMED',
  });

  const ratingData = await Registration.aggregate([
    { $match: { courseId: course._id, rating: { $exists: true } } },
    { $group: { _id: null, avgRating: { $avg: '$rating' } } },
  ]);

  const courseData = {
    ...course.toObject(),
    registrationCount,
    avgRating: ratingData.length > 0 ? ratingData[0].avgRating : 0,
  };

  const response = formatResponse(true, courseData, 'Course details retrieved successfully', 200);
  res.status(200).json(response);
});

/**
 * Search Courses
 */
export const searchCourses = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { q, page = 1, limit = 10 } = req.query;

  if (!q || (q as string).trim().length < 2) {
    throw new AppError(400, 'Search query must be at least 2 characters');
  }

  const { skip, limit: pageLimit, page: pageNum } = paginate(
    parseInt(page as string),
    parseInt(limit as string)
  );

  const courses = await Course.find(
    {
      $or: [
        { courseName: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { mentor: { $regex: q, $options: 'i' } },
      ],
      isActive: true,
    },
    'courseId courseName description mentor price finalPrice courseImage'
  )
    .skip(skip)
    .limit(pageLimit);

  const total = await Course.countDocuments({
    $or: [
      { courseName: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { mentor: { $regex: q, $options: 'i' } },
    ],
    isActive: true,
  });

  const response = formatResponse(
    true,
    {
      courses,
      query: q,
      pagination: {
        page: pageNum,
        limit: pageLimit,
        total,
        pages: Math.ceil(total / pageLimit),
      },
    },
    'Search results retrieved successfully',
    200
  );

  res.status(200).json(response);
});

/**
 * Get Courses by Type
 */
export const getCoursesByType = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { serviceType } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const validTypes = [
    'Agile',
    'Service',
    'SAFe',
    'Project',
    'Quality',
    'Business',
    'Generative AI',
  ];

  if (!validTypes.includes(serviceType)) {
    throw new AppError(400, 'Invalid service type');
  }

  const { skip, limit: pageLimit, page: pageNum } = paginate(
    parseInt(page as string),
    parseInt(limit as string)
  );

  const courses = await Course.find({
    serviceType,
    isActive: true,
  })
    .select('courseId courseName description mentor price finalPrice courseImage')
    .skip(skip)
    .limit(pageLimit)
    .sort({ startDate: 1 });

  const total = await Course.countDocuments({ serviceType, isActive: true });

  const response = formatResponse(
    true,
    {
      courses,
      pagination: {
        page: pageNum,
        limit: pageLimit,
        total,
        pages: Math.ceil(total / pageLimit),
      },
    },
    'Courses retrieved successfully',
    200
  );

  res.status(200).json(response);
});

/**
 * Get Course Reviews
 */
export const getCourseReviews = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { page = 1, limit = 10 } = req.query;

  const { skip, limit: pageLimit, page: pageNum } = paginate(
    parseInt(page as string),
    parseInt(limit as string)
  );

  const reviews = await Registration.aggregate([
    {
      $match: {
        courseId: new mongoose.Types.ObjectId(req.params.courseId),
        review: { $exists: true, $ne: null },
        rating: { $exists: true },
      },
    },
    {
      $lookup: {
        from: 'participants',
        localField: 'participantId',
        foreignField: '_id',
        as: 'participant',
      },
    },
    { $unwind: '$participant' },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: pageLimit },
    {
      $project: {
        rating: 1,
        review: 1,
        'participant.name': 1,
        createdAt: 1,
      },
    },
  ]);

  const total = await Registration.countDocuments({
    courseId: new mongoose.Types.ObjectId(req.params.courseId),
    review: { $exists: true, $ne: null },
  });

  const response = formatResponse(
    true,
    {
      reviews,
      pagination: {
        page: pageNum,
        limit: pageLimit,
        total,
        pages: Math.ceil(total / pageLimit),
      },
    },
    'Course reviews retrieved successfully',
    200
  );

  res.status(200).json(response);
});
