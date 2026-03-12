import { Response } from 'express';
import XLSX from 'xlsx';
import { CustomRequest } from '../../types/common';
import {
  db,
  courses,
  courseSchedules,
  serviceTypes,
  users
} from '../../models';
import {
  eq,
  and,
  ilike,
  or,
  sql,
  desc,
  asc
} from 'drizzle-orm';
import {
  calculateFinalPrice,
  paginate,
  formatResponse,
} from '../../utils/helpers';
import { AppError, asyncHandler } from '../../middleware/errorHandler';

const findCourseByParam = async (id: string | number) => {
  const courseId = typeof id === 'string' ? parseInt(id, 10) : id;

  if (isNaN(courseId)) return null;

  const results = await db.select()
    .from(courseSchedules)
    .where(eq(courseSchedules.id, courseId))
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .limit(1);

  if (results.length > 0) {
    const { course_schedules, courses: courseMasterData } = results[0];
    return {
      ...course_schedules,
      ...courseMasterData,
      id: course_schedules.id,
      countryPricing: course_schedules.pricing // Return as countryPricing for frontend compatibility
    };
  }

  return null;
};

/**
 * Create Course
 */
export const createCourse = asyncHandler(async (req: CustomRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'User not authenticated');
  }

  // Parse pricing if string (from FormData)
  if (typeof req.body.pricing === 'string') {
    try {
      req.body.pricing = JSON.parse(req.body.pricing);
    } catch (error) {
      throw new AppError(400, 'Invalid pricing format');
    }
  }

  const {
    courseId,
    mentor,
    startDate,
    endDate,
    startTime,
    endTime,
    batchType,
    courseType,
    address,
    language,
    description,
    difficultyLevel,
    duration,
    maxParticipants,
    pricing,
    countryPricing,
  } = req.body;

  const finalPricing = countryPricing ? (typeof countryPricing === 'string' ? JSON.parse(countryPricing) : countryPricing) : pricing;

  if (!courseId || !mentor || !startDate || !endDate || !finalPricing) {
    throw new AppError(400, 'Missing required fields');
  }

  if (new Date(startDate) >= new Date(endDate)) {
    throw new AppError(400, 'Start date must be before end date');
  }

  let brochureUrl;
  if (req.file) {
    brochureUrl = `${req.protocol}://${req.get('host')}/uploads/brochures/${req.file.filename}`;
  }

  // Create Course Schedule
  const newSchedule = await db.insert(courseSchedules).values({
    courseId: typeof courseId === 'string' ? parseInt(courseId) : courseId,
    mentor,
    startDate: new Date(startDate).toISOString().split('T')[0],
    endDate: new Date(endDate).toISOString().split('T')[0],
    startTime,
    endTime,
    batchType,
    courseType,
    address,
    language,
    description,
    difficultyLevel,
    duration: duration ? parseInt(duration as string) : null,
    maxParticipants: maxParticipants ? parseInt(maxParticipants as string) : null,
    capacityRemaining: maxParticipants ? parseInt(maxParticipants as string) : null,
    pricing: finalPricing, // Store the array as JSONB
    createdBy: req.user.id as unknown as number,
    brochureUrl,
  }).returning();

  const schedule = newSchedule[0];

  const response = formatResponse(true, schedule, 'Course schedule created successfully', 201);
  res.status(201).json(response);
});

/**
 * Update Course
 */
export const updateCourse = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { courseId } = req.params;
  const scheduleId = parseInt(courseId);

  if (typeof req.body.pricing === 'string') {
    try {
      req.body.pricing = JSON.parse(req.body.pricing);
    } catch (error) { }
  }

  const scheduleResults = await db.select()
    .from(courseSchedules)
    .where(eq(courseSchedules.id, scheduleId))
    .limit(1);

  if (scheduleResults.length === 0) {
    throw new AppError(404, 'Course schedule not found');
  }

  const currentSchedule = scheduleResults[0];

  if (req.body.startDate || req.body.endDate) {
    const startDate = new Date(req.body.startDate || currentSchedule.startDate);
    const endDate = new Date(req.body.endDate || currentSchedule.endDate);
    if (startDate >= endDate) {
      throw new AppError(400, 'Start date must be before end date');
    }
  }

  let brochureUrl = currentSchedule.brochureUrl;
  if (req.file) {
    brochureUrl = `${req.protocol}://${req.get('host')}/uploads/brochures/${req.file.filename}`;
  }

  const updateData: any = { ...req.body, brochureUrl };

  // Format numeric/date fields
  if (updateData.startDate) updateData.startDate = new Date(updateData.startDate).toISOString().split('T')[0];
  if (updateData.endDate) updateData.endDate = new Date(updateData.endDate).toISOString().split('T')[0];
  if (updateData.duration) updateData.duration = parseInt(updateData.duration);
  if (updateData.maxParticipants) updateData.maxParticipants = parseInt(updateData.maxParticipants);
  if (updateData.courseId) updateData.courseId = parseInt(updateData.courseId);

  // Handle pricing alias
  if (updateData.countryPricing) {
    updateData.pricing = typeof updateData.countryPricing === 'string'
      ? JSON.parse(updateData.countryPricing)
      : updateData.countryPricing;
    delete updateData.countryPricing;
  }

  await db.update(courseSchedules)
    .set(updateData)
    .where(eq(courseSchedules.id, scheduleId));

  const response = formatResponse(true, null, 'Course schedule updated successfully', 200);
  res.status(200).json(response);
});

/**
 * Get All Courses
 */
export const getAllCourses = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { page = 1, limit = 25, search, serviceType, batchType, courseType, sortBy = 'courseId', order = 'ASC' } = req.query;
  const { skip, limit: pageLimit, page: pageNum } = paginate(
    parseInt(page as string),
    parseInt(limit as string)
  );

  let whereClause = undefined;
  const conditions = [];

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

  if (batchType && batchType !== 'All' && batchType !== 'All Batches') {
    conditions.push(ilike(courseSchedules.batchType, `%${batchType}%`));
  }

  if (courseType && courseType !== 'All' && courseType !== 'All Types') {
    conditions.push(ilike(courseSchedules.courseType, `%${courseType}%`));
  }

  if (conditions.length > 0) {
    whereClause = and(...conditions);
  }

  // Determine sorting column
  let orderColumn: any = courseSchedules.id;
  if (sortBy === 'createdAt') orderColumn = courseSchedules.createdAt;
  if (sortBy === 'mentor') orderColumn = courseSchedules.mentor;
  if (sortBy === 'courseName') orderColumn = courses.name;

  const results = await db.select({
    id: courseSchedules.id,
    courseName: courses.name,
    serviceType: serviceTypes.name,
    batchType: courseSchedules.batchType,
    courseType: courseSchedules.courseType,
    isActive: courseSchedules.isActive,
  })
    .from(courseSchedules)
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .leftJoin(serviceTypes, eq(courses.serviceTypeId, serviceTypes.id))
    .where(whereClause)
    .limit(pageLimit)
    .offset(skip)
    .orderBy(order === 'DESC' ? desc(orderColumn) : asc(orderColumn));

  const totalResults = await db.select({ count: sql<number>`count(*)` })
    .from(courseSchedules)
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .leftJoin(serviceTypes, eq(courses.serviceTypeId, serviceTypes.id))
    .where(whereClause);

  const total = Number(totalResults[0].count);

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
 * Get Course By ID
 */
export const getCourseById = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { courseId } = req.params;
  const scheduleId = parseInt(courseId);
  const course = await findCourseByParam(scheduleId);

  if (!course) {
    throw new AppError(404, 'Course not found');
  }

  const response = formatResponse(true, course, 'Course retrieved successfully', 200);
  res.status(200).json(response);
});

/**
 * Delete Course
 */
export const deleteCourse = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { courseId } = req.params;
  const scheduleId = parseInt(courseId);

  await db.delete(courseSchedules).where(eq(courseSchedules.id, scheduleId));

  const response = formatResponse(true, null, 'Course schedule deleted successfully', 200);
  res.status(200).json(response);
});

/**
 * Activate/Deactivate Course
 */
export const activateCourse = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { courseId } = req.params;
  await db.update(courseSchedules).set({ isActive: true }).where(eq(courseSchedules.id, parseInt(courseId)));
  const response = formatResponse(true, null, 'Course activated successfully', 200);
  res.status(200).json(response);
});

export const deactivateCourse = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { courseId } = req.params;
  await db.update(courseSchedules).set({ isActive: false }).where(eq(courseSchedules.id, parseInt(courseId)));
  const response = formatResponse(true, null, 'Course deactivated successfully', 200);
  res.status(200).json(response);
});

/**
 * Import Courses (Placeholder)
 */
export const importCourses = asyncHandler(async (req: CustomRequest, res: Response) => {
  const response = formatResponse(true, null, 'Courses import functionality is currently being refactored', 200);
  res.status(200).json(response);
});

/**
 * Get All Service Types
 */
export const getAllServiceTypes = asyncHandler(async (req: CustomRequest, res: Response) => {
  const results = await db.select({
    id: serviceTypes.id,
    name: serviceTypes.name,
  }).from(serviceTypes)
    .orderBy(asc(serviceTypes.name));

  const response = formatResponse(true, results, 'Service types retrieved successfully', 200);
  res.status(200).json(response);
});

// Import courses logic would need similar normalization... leaving for now as user asked for schema first.
