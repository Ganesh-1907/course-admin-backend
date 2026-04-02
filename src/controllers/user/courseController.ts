import { Response } from 'express';
import { CustomRequest } from '../../types/common';
import {
  db,
  courseSchedules,
  courses,
  mentors,
  mentorCourseMappings,
  registrations,
  serviceTypes,
  viewCourseSchedules,
} from '../../models';
import {
  eq,
  and,
  or,
  ilike,
  sql,
  asc,
  desc,
  count,
} from 'drizzle-orm';
import { paginate, formatResponse } from '../../utils/helpers';
import { AppError, asyncHandler } from '../../middleware/errorHandler';

const DEFAULT_MENTOR_PHOTO_URL = 'https://course-management-assets.s3.ap-south-1.amazonaws.com/mentors/default-mentor.jpg';

const scheduleSelectFields = {
  scheduleId: courseSchedules.id,
  courseId: courses.id,
  courseName: courses.name,
  serviceType: serviceTypes.name,
  mentorId: mentors.id,
  mentor: mentors.name,
  mentorPhotoUrl: mentors.photoUrl,
  mentorDesignation: mentors.designation,
  mentorSpecialization: mentors.specialization,
  mentorRating: mentors.rating,
  mentorYearsOfExperience: mentors.yearsOfExperience,
  mentorLinkedinId: mentors.linkedinId,
  startDate: courseSchedules.startDate,
  endDate: courseSchedules.endDate,
  startTime: courseSchedules.startTime,
  endTime: courseSchedules.endTime,
  pricing: courseSchedules.pricing,
  brochureUrl: courseSchedules.brochureUrl,
  address: courseSchedules.address,
  batchType: courseSchedules.batchType,
  courseType: courseSchedules.courseType,
  language: courseSchedules.language,
  description: courseSchedules.description,
  difficultyLevel: courseSchedules.difficultyLevel,
  duration: courseSchedules.duration,
  capacityRemaining: courseSchedules.capacityRemaining,
  planAvailable: courseSchedules.planAvailable,
  isActive: courseSchedules.isActive,
};

const getMentorPhotoUrl = (photoUrl: string | null) => photoUrl || DEFAULT_MENTOR_PHOTO_URL;

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
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  };

  return `${formatTime(startTime)} - ${formatTime(endTime)} IST`;
};

const getCountryRegion = (req: any): string => {
  const queryRegion = req.query.region as string;
  if (queryRegion) {
    return queryRegion.length <= 3 ? mapCodeToRegion(queryRegion) : queryRegion;
  }

  const cfCountry = req.headers['cf-ipcountry'] as string;
  if (cfCountry && cfCountry !== 'XX') {
    return mapCodeToRegion(cfCountry);
  }

  return 'India';
};

const mapCodeToRegion = (code: string): string => {
  const upperCode = code.toUpperCase();
  const mapping: Record<string, string> = {
    IN: 'India',
    US: 'USA',
    CA: 'Canada',
    AU: 'Australia',
    SG: 'Singapore',
    GB: 'Europe',
    DE: 'Europe',
    FR: 'Europe',
    IT: 'Europe',
    ES: 'Europe',
    NL: 'Europe',
    BE: 'Europe',
    SE: 'Europe',
    NO: 'Europe',
    DK: 'Europe',
    FI: 'Europe',
    IE: 'Europe',
    CH: 'Europe',
    AT: 'Europe',
    PT: 'Europe',
    GR: 'Europe',
    PL: 'Europe',
  };
  return mapping[upperCode] || 'USA';
};

const mapCourseCard = (row: any) => ({
  id: row.scheduleId,
  courseId: row.courseId,
  courseName: row.courseName,
  description: row.description || row.courseName,
  mentor: row.mentor,
  mentorId: row.mentorId,
  mentorPhotoUrl: getMentorPhotoUrl(row.mentorPhotoUrl),
  mentorProfile: {
    id: row.mentorId,
    name: row.mentor,
    designation: row.mentorDesignation,
    specialization: row.mentorSpecialization,
    rating: row.mentorRating !== null && row.mentorRating !== undefined ? Number(row.mentorRating) : null,
    yearsOfExperience: row.mentorYearsOfExperience,
    linkedinId: row.mentorLinkedinId,
    photoUrl: getMentorPhotoUrl(row.mentorPhotoUrl),
  },
  serviceType: row.serviceType,
  startDate: row.startDate,
  endDate: row.endDate,
  pricing: row.pricing,
  brochureUrl: row.brochureUrl,
});

/**
 * Get All Courses (Public)
 */
export const getAllCourses = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { page = 1, limit = 25, search, serviceType } = req.query;

  const { skip, limit: pageLimit, page: pageNum } = paginate(
    parseInt(page as string, 10),
    parseInt(limit as string, 10),
  );

  const conditions: any[] = [eq(courseSchedules.isActive, true)];

  if (search) {
    const searchStr = `%${search}%`;
    conditions.push(or(
      ilike(courses.name, searchStr),
      ilike(mentors.name, searchStr),
    ));
  }

  if (serviceType && serviceType !== 'All Types') {
    conditions.push(ilike(serviceTypes.name, String(serviceType)));
  }

  const whereClause = and(...conditions);

  const results = await db.select(scheduleSelectFields)
    .from(courseSchedules)
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .innerJoin(mentors, eq(courseSchedules.mentorId, mentors.id))
    .leftJoin(serviceTypes, eq(courses.serviceTypeId, serviceTypes.id))
    .where(whereClause)
    .limit(pageLimit)
    .offset(skip)
    .orderBy(desc(courseSchedules.startDate));

  const countResults = await db.select({ count: count() })
    .from(courseSchedules)
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .innerJoin(mentors, eq(courseSchedules.mentorId, mentors.id))
    .leftJoin(serviceTypes, eq(courses.serviceTypeId, serviceTypes.id))
    .where(whereClause);

  const response = formatResponse(
    true,
    {
      courses: results.map(mapCourseCard),
      pagination: {
        page: pageNum,
        limit: pageLimit,
        total: Number(countResults[0].count),
        pages: Math.ceil(Number(countResults[0].count) / pageLimit),
      },
    },
    'Courses retrieved successfully',
    200,
  );

  res.status(200).json(response);
});

/**
 * Get Course Details
 */
export const getCourseDetails = asyncHandler(async (req: CustomRequest, res: Response) => {
  const scheduleId = parseInt(req.params.courseId, 10);

  if (Number.isNaN(scheduleId)) {
    throw new AppError(400, 'Invalid course ID');
  }

  const courseResults = await db.select(scheduleSelectFields)
    .from(courseSchedules)
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .innerJoin(mentors, eq(courseSchedules.mentorId, mentors.id))
    .leftJoin(serviceTypes, eq(courses.serviceTypeId, serviceTypes.id))
    .where(and(eq(courseSchedules.isActive, true), eq(courseSchedules.id, scheduleId)))
    .limit(1);

  if (courseResults.length === 0) {
    throw new AppError(404, 'Course not found');
  }

  const course = courseResults[0];

  const enrollmentCountRes = await db.select({ count: count() })
    .from(registrations)
    .where(and(eq(registrations.scheduleId, scheduleId), eq(registrations.status, 'CONFIRMED')));

  const courseData = {
    ...mapCourseCard(course),
    address: course.address,
    batchType: course.batchType,
    courseType: course.courseType,
    startTime: course.startTime,
    endTime: course.endTime,
    description: course.description,
    difficultyLevel: course.difficultyLevel,
    duration: course.duration,
    capacityRemaining: course.capacityRemaining,
    planAvailable: course.planAvailable,
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
    parseInt(page as string, 10),
    parseInt(limit as string, 10),
  );

  const searchStr = `%${q}%`;
  const whereClause = and(
    eq(courseSchedules.isActive, true),
    or(
      ilike(courses.name, searchStr),
      ilike(mentors.name, searchStr),
    ),
  );

  const results = await db.select(scheduleSelectFields)
    .from(courseSchedules)
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .innerJoin(mentors, eq(courseSchedules.mentorId, mentors.id))
    .leftJoin(serviceTypes, eq(courses.serviceTypeId, serviceTypes.id))
    .where(whereClause)
    .limit(pageLimit)
    .offset(skip);

  const countResults = await db.select({ count: count() })
    .from(courseSchedules)
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .innerJoin(mentors, eq(courseSchedules.mentorId, mentors.id))
    .where(whereClause);

  const response = formatResponse(
    true,
    {
      courses: results.map(mapCourseCard),
      query: q,
      pagination: {
        page: pageNum,
        limit: pageLimit,
        total: Number(countResults[0].count),
        pages: Math.ceil(Number(countResults[0].count) / pageLimit),
      },
    },
    'Search results retrieved successfully',
    200,
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
    parseInt(page as string, 10),
    parseInt(limit as string, 10),
  );

  const whereClause = and(
    eq(serviceTypes.name, serviceType),
    eq(courseSchedules.isActive, true),
  );

  const coursesResults = await db.select(scheduleSelectFields)
    .from(courseSchedules)
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .innerJoin(mentors, eq(courseSchedules.mentorId, mentors.id))
    .innerJoin(serviceTypes, eq(courses.serviceTypeId, serviceTypes.id))
    .where(whereClause)
    .limit(pageLimit)
    .offset(skip)
    .orderBy(desc(courseSchedules.startDate));

  const countResults = await db.select({ count: count() })
    .from(courseSchedules)
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .innerJoin(mentors, eq(courseSchedules.mentorId, mentors.id))
    .innerJoin(serviceTypes, eq(courses.serviceTypeId, serviceTypes.id))
    .where(whereClause);

  const response = formatResponse(
    true,
    {
      courses: coursesResults.map(mapCourseCard),
      pagination: {
        page: pageNum,
        limit: pageLimit,
        total: Number(countResults[0].count),
        pages: Math.ceil(Number(countResults[0].count) / pageLimit),
      },
    },
    'Courses retrieved successfully',
    200,
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

  const courseResults = await db.select()
    .from(courses)
    .where(ilike(courses.name, `%${courseName}%`))
    .limit(1);

  if (courseResults.length === 0) {
    return res.status(200).json(formatResponse(true, null, 'Course not found', 200));
  }

  const course = courseResults[0];
  const today = new Date().toISOString().split('T')[0];

  const schedules = await db.select(scheduleSelectFields)
    .from(courseSchedules)
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .innerJoin(mentors, eq(courseSchedules.mentorId, mentors.id))
    .leftJoin(serviceTypes, eq(courses.serviceTypeId, serviceTypes.id))
    .where(and(
      eq(courseSchedules.courseId, course.id),
      eq(courseSchedules.isActive, true),
      sql`${courseSchedules.startDate} >= ${today}`,
    ))
    .orderBy(courseSchedules.startDate)
    .limit(1);

  if (schedules.length === 0) {
    return res.status(200).json(formatResponse(true, null, 'No active schedules found', 200));
  }

  const schedule = schedules[0];
  const pricing = (schedule.pricing as any[]) || [];
  const region = getCountryRegion(req);
  const regionPricing = pricing.find((p) => p.country === region) || pricing.find((p) => p.country === 'USA') || pricing[0] || {};

  const formattedSchedule = {
    courseCode: (course.name || '').split(' ').map((word: string) => word[0]).join('').substring(0, 3).toUpperCase(),
    courseName: course.name,
    dateRange: formatScheduleDate(schedule.startDate, schedule.endDate),
    timeRange: formatScheduleTime(schedule.startTime, schedule.endTime),
    trainerName: schedule.mentor,
    trainerImage: getMentorPhotoUrl(schedule.mentorPhotoUrl),
    originalPrice: `${regionPricing.currency || 'INR'} ${regionPricing.price?.toLocaleString() || '0'}`,
    discountedPrice: `${regionPricing.currency || 'INR'} ${regionPricing.finalPrice?.toLocaleString() || '0'}`,
    discountPercentage: regionPricing.discountPercentage?.toString() || '0',
    scheduleId: schedule.scheduleId,
    courseId: course.id,
    mentorId: schedule.mentorId,
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

  const courseResults = await db.select()
    .from(courses)
    .where(ilike(courses.name, `%${courseName}%`))
    .limit(1);

  if (courseResults.length === 0) {
    return res.status(200).json(formatResponse(true, { schedules: [], course: null }, 'Course not found', 200));
  }

  const course = courseResults[0];
  const today = new Date().toISOString().split('T')[0];

  const schedules = await db.select(scheduleSelectFields)
    .from(courseSchedules)
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .innerJoin(mentors, eq(courseSchedules.mentorId, mentors.id))
    .leftJoin(serviceTypes, eq(courses.serviceTypeId, serviceTypes.id))
    .where(and(
      eq(courseSchedules.courseId, course.id),
      eq(courseSchedules.isActive, true),
      sql`${courseSchedules.startDate} >= ${today}`,
    ))
    .orderBy(courseSchedules.startDate);

  const region = getCountryRegion(req);

  const formattedSchedules = schedules.map((schedule) => {
    const pricing = (schedule.pricing as any[]) || [];
    const regionPricing = pricing.find((p) => p.country === region) || pricing.find((p) => p.country === 'USA') || pricing[0] || {};

    return {
      id: schedule.scheduleId,
      dateRange: formatScheduleDate(schedule.startDate, schedule.endDate),
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      timeRange: formatScheduleTime(schedule.startTime, schedule.endTime),
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      trainerName: schedule.mentor,
      trainerImage: getMentorPhotoUrl(schedule.mentorPhotoUrl),
      originalPrice: regionPricing.price || 0,
      discountedPrice: regionPricing.finalPrice || 0,
      currency: regionPricing.currency || 'INR',
      discountPercentage: regionPricing.discountPercentage || 0,
      batchType: schedule.batchType,
      courseType: schedule.courseType,
      language: schedule.language,
      capacityRemaining: schedule.capacityRemaining,
      mentorId: schedule.mentorId,
    };
  });

  const response = formatResponse(
    true,
    {
      schedules: formattedSchedules,
      course: {
        id: course.id,
        name: course.name,
      },
      debug: { region, ip: req.ip || req.connection?.remoteAddress },
    },
    'Schedules retrieved successfully',
    200,
  );
  res.status(200).json(response);
});

/**
 * Get Mentors by Course Name (Public)
 */
export const getMentorsByCourseName = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { courseName } = req.query;

  if (!courseName) {
    throw new AppError(400, 'Course name is required');
  }

  const courseResults = await db.select({
    id: courses.id,
    name: courses.name,
    serviceTypeId: serviceTypes.id,
    serviceTypeName: serviceTypes.name,
  })
    .from(courses)
    .leftJoin(serviceTypes, eq(courses.serviceTypeId, serviceTypes.id))
    .where(ilike(courses.name, `%${courseName}%`))
    .limit(1);

  if (courseResults.length === 0) {
    return res.status(200).json(formatResponse(true, { course: null, mentors: [] }, 'Course not found', 200));
  }

  const course = courseResults[0];

  const mentorResults = await db.select({
    id: mentors.id,
    name: mentors.name,
    specialization: mentors.specialization,
    designation: mentors.designation,
    description: mentors.description,
    rating: mentors.rating,
    yearsOfExperience: mentors.yearsOfExperience,
    linkedinId: mentors.linkedinId,
    photoUrl: mentors.photoUrl,
  })
    .from(mentorCourseMappings)
    .innerJoin(mentors, eq(mentorCourseMappings.mentorId, mentors.id))
    .where(and(
      eq(mentorCourseMappings.courseId, course.id),
      eq(mentors.isActive, true),
    ))
    .orderBy(desc(mentors.yearsOfExperience), asc(mentors.name));

  const mentorsData = mentorResults.map((mentor) => ({
    ...mentor,
    rating: mentor.rating !== null && mentor.rating !== undefined ? Number(mentor.rating) : null,
    photoUrl: getMentorPhotoUrl(mentor.photoUrl),
  }));

  const response = formatResponse(
    true,
    {
      course,
      mentors: mentorsData,
    },
    'Mentors retrieved successfully',
    200,
  );

  res.status(200).json(response);
});

/**
 * Get Public Mentor Directory
 */
export const getPublicMentors = asyncHandler(async (req: CustomRequest, res: Response) => {
  const requestedServiceType = typeof req.query.serviceType === 'string' ? req.query.serviceType.trim() : '';
  const conditions: any[] = [eq(mentors.isActive, true)];

  if (requestedServiceType && requestedServiceType !== 'All') {
    conditions.push(ilike(serviceTypes.name, requestedServiceType));
  }

  const mentorRows = await db.select({
    id: mentors.id,
    name: mentors.name,
    specialization: mentors.specialization,
    designation: mentors.designation,
    description: mentors.description,
    rating: mentors.rating,
    yearsOfExperience: mentors.yearsOfExperience,
    linkedinId: mentors.linkedinId,
    photoUrl: mentors.photoUrl,
    courseId: courses.id,
    courseName: courses.name,
    serviceTypeId: serviceTypes.id,
    serviceTypeName: serviceTypes.name,
  })
    .from(mentorCourseMappings)
    .innerJoin(mentors, eq(mentorCourseMappings.mentorId, mentors.id))
    .innerJoin(courses, eq(mentorCourseMappings.courseId, courses.id))
    .leftJoin(serviceTypes, eq(courses.serviceTypeId, serviceTypes.id))
    .where(and(...conditions))
    .orderBy(
      desc(mentors.yearsOfExperience),
      desc(mentors.rating),
      asc(mentors.name),
      asc(courses.name),
    );

  const mentorDirectory = new Map<number, {
    id: number;
    name: string;
    specialization: string | null;
    designation: string | null;
    description: string | null;
    rating: number | null;
    yearsOfExperience: number | null;
    linkedinId: string | null;
    photoUrl: string | null;
    courses: Set<string>;
    serviceTypes: Set<string>;
  }>();

  mentorRows.forEach((row) => {
    const existing = mentorDirectory.get(row.id);

    if (!existing) {
      mentorDirectory.set(row.id, {
        id: row.id,
        name: row.name,
        specialization: row.specialization,
        designation: row.designation,
        description: row.description,
        rating: row.rating !== null && row.rating !== undefined ? Number(row.rating) : null,
        yearsOfExperience: row.yearsOfExperience,
        linkedinId: row.linkedinId,
        photoUrl: getMentorPhotoUrl(row.photoUrl),
        courses: new Set(row.courseName ? [row.courseName] : []),
        serviceTypes: new Set(row.serviceTypeName ? [row.serviceTypeName] : []),
      });
      return;
    }

    if (row.courseName) {
      existing.courses.add(row.courseName);
    }

    if (row.serviceTypeName) {
      existing.serviceTypes.add(row.serviceTypeName);
    }
  });

  const trainers = Array.from(mentorDirectory.values()).map((mentor) => ({
    id: mentor.id,
    name: mentor.name,
    specialization: mentor.specialization,
    designation: mentor.designation,
    description: mentor.description,
    rating: mentor.rating,
    yearsOfExperience: mentor.yearsOfExperience,
    linkedinId: mentor.linkedinId,
    photoUrl: mentor.photoUrl,
    courses: Array.from(mentor.courses),
    serviceTypes: Array.from(mentor.serviceTypes),
    courseCount: mentor.courses.size,
  }));

  const response = formatResponse(
    true,
    {
      serviceType: requestedServiceType || 'All',
      trainers,
      total: trainers.length,
    },
    'Mentor directory retrieved successfully',
    200,
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

  const region = getCountryRegion(req);
  const today = new Date().toISOString().split('T')[0];
  const searchTerm = serviceType.replace(/-/g, ' ');

  const results = await db.select()
    .from(viewCourseSchedules)
    .where(and(
      ilike(viewCourseSchedules.serviceTypeName, searchTerm),
      eq(viewCourseSchedules.is_active, true),
      sql`${viewCourseSchedules.startDate} >= ${today}`,
    ))
    .orderBy(viewCourseSchedules.startDate);

  const formattedSchedules = results.map((schedule) => {
    const pricing = (schedule.pricing as any[]) || [];
    const regionPricing = pricing.find((p) => p.country === region) || pricing.find((p) => p.country === 'USA') || pricing[0] || {};

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
      trainerImage: getMentorPhotoUrl(schedule.mentorPhotoUrl),
      originalPrice: regionPricing.price || 0,
      discountedPrice: regionPricing.finalPrice || 0,
      currency: regionPricing.currency || 'INR',
      discountPercentage: regionPricing.discountPercentage || 0,
      batchType: schedule.batchType,
      courseType: schedule.courseType,
      language: schedule.language,
      capacityRemaining: schedule.capacityRemaining,
      difficultyLevel: schedule.difficultyLevel,
      duration: schedule.duration,
      mentorId: schedule.mentorId,
      mentorDesignation: schedule.mentorDesignation,
      mentorSpecialization: schedule.mentorSpecialization,
      mentorRating: schedule.mentorRating !== null && schedule.mentorRating !== undefined ? Number(schedule.mentorRating) : null,
      mentorYearsOfExperience: schedule.mentorYearsOfExperience,
      mentorLinkedinId: schedule.mentorLinkedinId,
    };
  });

  const response = formatResponse(
    true,
    {
      schedules: formattedSchedules,
      serviceType,
      debug: { region, ip: req.ip || req.connection?.remoteAddress },
    },
    'Schedules for service type retrieved successfully',
    200,
  );

  res.status(200).json(response);
});

/**
 * Get All Service Types
 */
export const getServiceTypes = asyncHandler(async (_req: CustomRequest, res: Response) => {
  const results = await db.select().from(serviceTypes).orderBy(serviceTypes.name);

  const response = formatResponse(true, results, 'Service types retrieved successfully', 200);
  res.status(200).json(response);
});
