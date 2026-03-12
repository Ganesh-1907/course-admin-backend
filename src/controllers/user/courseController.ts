import { Response } from 'express';
import { CustomRequest } from '../../types/common';
import {
  db,
  courseSchedules,
  courses,
  registrations,
  users,
  serviceTypes
} from '../../models';
import {
  eq,
  and,
  or,
  ilike,
  sql,
  desc,
  count,
} from 'drizzle-orm';
import { paginate, formatResponse } from '../../utils/helpers';
import { AppError, asyncHandler } from '../../middleware/errorHandler';

/**
 * Get All Courses (Public)
 */
export const getAllCourses = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { page = 1, limit = 25, search, serviceType } = req.query;

  const { skip, limit: pageLimit, page: pageNum } = paginate(
    parseInt(page as string),
    parseInt(limit as string)
  );

  const conditions = [eq(courseSchedules.isActive, true)];

  if (search) {
    const searchStr = `%${search}%`;
    conditions.push(or(
      ilike(courses.name, searchStr),
      ilike(courseSchedules.mentor, searchStr)
    ));
  }

  if (serviceType && serviceType !== 'All Types') {
    conditions.push(ilike(serviceTypes.name, serviceType as string));
  }

  const whereClause = and(...conditions);

  const results = await db.select({
    id: courseSchedules.id,
    courseName: courses.name,
    description: courses.name, // Usually courses.description but simplified schema has only name
    mentor: courseSchedules.mentor,
    serviceType: serviceTypes.name,
    startDate: courseSchedules.startDate,
    endDate: courseSchedules.endDate,
    pricing: courseSchedules.pricing,
    brochureUrl: courseSchedules.brochureUrl,
  })
    .from(courseSchedules)
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .leftJoin(serviceTypes, eq(courses.serviceTypeId, serviceTypes.id))
    .where(whereClause)
    .limit(pageLimit)
    .offset(skip)
    .orderBy(desc(courseSchedules.startDate));

  const countResults = await db.select({ count: count() })
    .from(courseSchedules)
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .leftJoin(serviceTypes, eq(courses.serviceTypeId, serviceTypes.id))
    .where(whereClause);

  const total = Number(countResults[0].count);

  const response = formatResponse(
    true,
    {
      courses: results,
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
  const courseId = parseInt(req.params.courseId);

  if (isNaN(courseId)) {
    throw new AppError(400, 'Invalid course ID');
  }

  const courseResults = await db.select({
    id: courseSchedules.id,
    courseName: courses.name,
    mentor: courseSchedules.mentor,
    serviceType: serviceTypes.name,
    startDate: courseSchedules.startDate,
    endDate: courseSchedules.endDate,
    pricing: courseSchedules.pricing,
    address: courseSchedules.address,
    batchType: courseSchedules.batchType,
    courseType: courseSchedules.courseType,
    startTime: courseSchedules.startTime,
    endTime: courseSchedules.endTime,
    brochureUrl: courseSchedules.brochureUrl,
    description: courseSchedules.description,
    difficultyLevel: courseSchedules.difficultyLevel,
    duration: courseSchedules.duration,
  })
    .from(courseSchedules)
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .leftJoin(serviceTypes, eq(courses.serviceTypeId, serviceTypes.id))
    .where(and(eq(courseSchedules.isActive, true), eq(courseSchedules.id, courseId)))
    .limit(1);

  if (courseResults.length === 0) {
    throw new AppError(404, 'Course not found');
  }

  const course = courseResults[0];

  const enrollmentCountRes = await db.select({ count: count() })
    .from(registrations)
    .where(and(eq(registrations.scheduleId, course.id), eq(registrations.status, 'CONFIRMED')));

  const courseData = {
    ...course,
    enrollmentCount: Number(enrollmentCountRes[0].count),
  };

  const response = formatResponse(true, courseData, 'Course details retrieved successfully', 200);
  res.status(200).json(response);
});

/**
 * Search Courses
 */
export const searchCourses = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { q, page = 1, limit = 25 } = req.query;

  if (!q || (q as string).trim().length < 2) {
    throw new AppError(400, 'Search query must be at least 2 characters');
  }

  const { skip, limit: pageLimit, page: pageNum } = paginate(
    parseInt(page as string),
    parseInt(limit as string)
  );

  const searchStr = `%${q}%`;
  const whereClause = and(
    eq(courseSchedules.isActive, true),
    or(
      ilike(courses.name, searchStr),
      ilike(courseSchedules.mentor, searchStr)
    )
  );

  const results = await db.select({
    id: courseSchedules.id,
    courseName: courses.name,
    mentor: courseSchedules.mentor,
    pricing: courseSchedules.pricing,
  })
    .from(courseSchedules)
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .where(whereClause)
    .limit(pageLimit)
    .offset(skip);

  const countResults = await db.select({ count: count() })
    .from(courseSchedules)
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .where(whereClause);

  const total = Number(countResults[0].count);

  const response = formatResponse(
    true,
    {
      courses: results,
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
  const { page = 1, limit = 25 } = req.query;

  const { skip, limit: pageLimit, page: pageNum } = paginate(
    parseInt(page as string),
    parseInt(limit as string)
  );

  const coursesResults = await db.select({
    id: courseSchedules.id,
    courseName: courses.name,
    mentor: courseSchedules.mentor,
    pricing: courseSchedules.pricing,
  })
    .from(courseSchedules)
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .innerJoin(serviceTypes, eq(courses.serviceTypeId, serviceTypes.id))
    .where(and(eq(serviceTypes.name, serviceType), eq(courseSchedules.isActive, true)))
    .limit(pageLimit)
    .offset(skip)
    .orderBy(desc(courseSchedules.startDate));

  const countResults = await db.select({ count: count() })
    .from(courseSchedules)
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .innerJoin(serviceTypes, eq(courses.serviceTypeId, serviceTypes.id))
    .where(and(eq(serviceTypes.name, serviceType), eq(courseSchedules.isActive, true)));

  const total = Number(countResults[0].count);

  const response = formatResponse(
    true,
    {
      courses: coursesResults,
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
