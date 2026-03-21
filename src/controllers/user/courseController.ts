import { Response } from 'express';
import { CustomRequest } from '../../types/common';
import config from '../../config/env';
import {
  db,
  courseSchedules,
  courses,
  registrations,
  users,
  serviceTypes,
  viewCourseSchedules
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

const formatScheduleDate = (startDate: string, endDate: string) => {
  const s = new Date(startDate);
  const e = new Date(endDate);

  const options: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit' };
  const startStr = s.toLocaleDateString('en-US', options);

  const endOptions: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit', year: 'numeric' };
  const endStr = e.toLocaleDateString('en-US', endOptions);

  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${startStr} - ${e.toLocaleDateString('en-US', { day: '2-digit' })}, ${e.getFullYear()}`;
  }
  return `${startStr} - ${endStr}`;
};

const formatScheduleTime = (startTime: string | null, endTime: string | null) => {
  if (!startTime || !endTime) return 'Flexible Timing';

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  };

  return `${formatTime(startTime)} - ${formatTime(endTime)} IST`;
};

const getCountryRegion = (req: any): string => {
  // 0. Debug/Manual Override: allow region via query parameter
  const queryRegion = req.query.region as string;
  if (queryRegion) {
    console.log(`[GEO] Using query override region: ${queryRegion}`);
    // Support either full name (India) or code (IN)
    return queryRegion.length <= 3 ? mapCodeToRegion(queryRegion) : queryRegion;
  }

  // 1. Primary: Cloudflare header (only available in production behind Cloudflare)
  const cfCountry = req.headers['cf-ipcountry'] as string;
  if (cfCountry && cfCountry !== 'XX') {
    console.log(`[GEO] Using Cloudflare country: ${cfCountry}`);
    return mapCodeToRegion(cfCountry);
  }

  // 2. Fallback: Localhost/Development — always default to India
  //    because Cloudflare is not present on localhost
  //    In production, Cloudflare header will always be present
  console.log(`[GEO] No Cloudflare header found. Defaulting to India (dev/localhost fallback).`);
  return 'India';
};

const mapCodeToRegion = (code: string): string => {
  const upperCode = code.toUpperCase();
  const mapping: Record<string, string> = {
    'IN': 'India',
    'US': 'USA',
    'CA': 'Canada',
    'AU': 'Australia',
    'SG': 'Singapore',
    // European countries
    'GB': 'Europe', 'DE': 'Europe', 'FR': 'Europe', 'IT': 'Europe', 'ES': 'Europe',
    'NL': 'Europe', 'BE': 'Europe', 'SE': 'Europe', 'NO': 'Europe', 'DK': 'Europe',
    'FI': 'Europe', 'IE': 'Europe', 'CH': 'Europe', 'AT': 'Europe', 'PT': 'Europe',
    'GR': 'Europe', 'PL': 'Europe'
  };
  return mapping[upperCode] || 'USA';
};

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

/**
 * Get Recent Schedule by Course Name (Public)
 */
export const getRecentScheduleByCourseName = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { courseName } = req.query;

  if (!courseName) {
    throw new AppError(400, 'Course name is required');
  }

  // Find the course by name (fuzzy match)
  const courseResults = await db.select()
    .from(courses)
    .where(ilike(courses.name, `%${courseName}%`))
    .limit(1);

  if (courseResults.length === 0) {
    return res.status(200).json(formatResponse(true, null, 'Course not found', 200));
  }

  const course = courseResults[0];

  // Find the most recent active schedule
  const today = new Date().toISOString().split('T')[0];
  const schedules = await db.select()
    .from(courseSchedules)
    .where(and(
      eq(courseSchedules.courseId, course.id),
      eq(courseSchedules.isActive, true),
      sql`${courseSchedules.startDate} >= ${today}`
    ))
    .orderBy(courseSchedules.startDate)
    .limit(1);

  if (schedules.length === 0) {
    return res.status(200).json(formatResponse(true, null, 'No active schedules found', 200));
  }

  const schedule = schedules[0];
  const pricing = (schedule.pricing as any[]) || [];

  // Get country region from request
  const region = getCountryRegion(req);

  const regionPricing = pricing.find(p => p.country === region) || pricing.find(p => p.country === 'USA') || pricing[0] || {};

  const formattedSchedule = {
    courseCode: (course.name || '').split(' ').map((word: string) => word[0]).join('').substring(0, 3).toUpperCase(),
    courseName: course.name,
    dateRange: formatScheduleDate(schedule.startDate, schedule.endDate),
    timeRange: formatScheduleTime(schedule.startTime, schedule.endTime),
    trainerName: schedule.mentor,
    trainerImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100', // Default image
    originalPrice: `${regionPricing.currency || 'INR'} ${regionPricing.price?.toLocaleString() || '0'}`,
    discountedPrice: `${regionPricing.currency || 'INR'} ${regionPricing.finalPrice?.toLocaleString() || '0'}`,
    discountPercentage: regionPricing.discountPercentage?.toString() || '0',
    scheduleId: schedule.id,
    courseId: course.id
  };

  const response = formatResponse(true, { ...formattedSchedule, debug: { region, ip: req.ip } }, 'Recent schedule retrieved successfully', 200);
  res.status(200).json(response);
});

/**
 * Get All Schedules by Course Name (Public)
 */
export const getAllSchedulesByCourseName = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { courseName } = req.query;

  if (!courseName) {
    throw new AppError(400, 'Course name is required');
  }

  // Find the course (fuzzy match)
  const courseResults = await db.select()
    .from(courses)
    .where(ilike(courses.name, `%${courseName}%`))
    .limit(1);

  if (courseResults.length === 0) {
    return res.status(200).json(formatResponse(true, { schedules: [], course: null }, 'Course not found', 200));
  }

  const course = courseResults[0];

  // Find all active schedules from today onwards
  const today = new Date().toISOString().split('T')[0];
  const schedules = await db.select()
    .from(courseSchedules)
    .where(and(
      eq(courseSchedules.courseId, course.id),
      eq(courseSchedules.isActive, true),
      sql`${courseSchedules.startDate} >= ${today}`
    ))
    .orderBy(courseSchedules.startDate);

  // Get country region from request
  const region = getCountryRegion(req);

  const formattedSchedules = schedules.map(schedule => {
    const pricing = (schedule.pricing as any[]) || [];

    const regionPricing = pricing.find(p => p.country === region) || pricing.find(p => p.country === 'USA') || pricing[0] || {};

    return {
      id: schedule.id,
      dateRange: formatScheduleDate(schedule.startDate, schedule.endDate),
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      timeRange: formatScheduleTime(schedule.startTime, schedule.endTime),
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      trainerName: schedule.mentor,
      trainerImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100',
      originalPrice: regionPricing.price || 0,
      discountedPrice: regionPricing.finalPrice || 0,
      currency: regionPricing.currency || 'INR',
      discountPercentage: regionPricing.discountPercentage || 0,
      batchType: schedule.batchType,
      courseType: schedule.courseType,
      language: schedule.language,
      capacityRemaining: schedule.capacityRemaining
    };
  });

  const response = formatResponse(
    true,
    {
      schedules: formattedSchedules,
      course: {
        id: course.id,
        name: course.name
      },
      debug: { region, ip: req.ip || req.connection?.remoteAddress }
    },
    'Schedules retrieved successfully',
    200
  );
  res.status(200).json(response);
});

/**
 * Get Schedules by Service Type (Categorized)
 */
export const getSchedulesByServiceType = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { serviceType } = req.params;

  if (!serviceType) {
    throw new AppError(400, 'Service type is required');
  }

  // Get country region from request
  const region = getCountryRegion(req);
  const today = new Date().toISOString().split('T')[0];

  // Sanitize serviceType (replace hyphens with spaces for better matching with DB names like "Generative AI")
  const searchTerm = serviceType.replace(/-/g, ' ');

  const results = await db.select()
    .from(viewCourseSchedules)
    .where(and(
      ilike(viewCourseSchedules.serviceTypeName, searchTerm),
      eq(viewCourseSchedules.is_active, true),
      sql`${viewCourseSchedules.startDate} >= ${today}`
    ))
    .orderBy(viewCourseSchedules.startDate);

  const formattedSchedules = results.map(schedule => {
    const pricing = (schedule.pricing as any[]) || [];
    const regionPricing = pricing.find(p => p.country === region) || pricing.find(p => p.country === 'USA') || pricing[0] || {};

    return {
      id: schedule.scheduleId,
      courseId: schedule.courseId,
      courseName: schedule.courseName,
      dateRange: formatScheduleDate(schedule.startDate!, schedule.endDate!),
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      timeRange: formatScheduleTime(schedule.startTime!, schedule.endTime!),
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      trainerName: schedule.mentor,
      trainerImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100',
      originalPrice: regionPricing.price || 0,
      discountedPrice: regionPricing.finalPrice || 0,
      currency: regionPricing.currency || 'INR',
      discountPercentage: regionPricing.discountPercentage || 0,
      batchType: schedule.batchType,
      courseType: schedule.courseType,
      language: schedule.language,
      capacityRemaining: schedule.capacityRemaining,
      difficultyLevel: schedule.difficultyLevel,
      duration: schedule.duration
    };
  });

  const response = formatResponse(
    true,
    {
      schedules: formattedSchedules,
      serviceType,
      debug: { region, ip: req.ip || req.connection?.remoteAddress }
    },
    'Schedules for service type retrieved successfully',
    200
  );

  res.status(200).json(response);
});
