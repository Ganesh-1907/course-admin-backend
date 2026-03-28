import { Response } from 'express';
import { CustomRequest } from '../../types/common';
import {
  db,
  registrations,
  courseSchedules,
  courses,
  users
} from '../../models';
import {
  eq,
  and,
  ne,
  desc,
  sql,
  count
} from 'drizzle-orm';
import { paginate, formatResponse } from '../../utils/helpers';
import { AppError, asyncHandler } from '../../middleware/errorHandler';

/**
 * Register for Course
 */
export const registerForCourse = asyncHandler(async (req: CustomRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'User not authenticated');
  }

  const { courseId } = req.body; // courseId here is the schedule ID

  if (!courseId) {
    throw new AppError(400, 'Course schedule ID is required');
  }

  const scheduleId = parseInt(courseId as string);

  const scheduleResults = await db.select()
    .from(courseSchedules)
    .where(eq(courseSchedules.id, scheduleId))
    .limit(1);

  if (scheduleResults.length === 0) {
    throw new AppError(404, 'Course schedule not found');
  }

  const schedule = scheduleResults[0];

  if (!schedule.isActive) {
    throw new AppError(400, 'Course is not available');
  }

  const existingRegistration = await db.select()
    .from(registrations)
    .where(and(
      eq(registrations.userId, req.user.id),
      eq(registrations.scheduleId, scheduleId),
      ne(registrations.status, 'CANCELLED')
    ))
    .limit(1);

  if (existingRegistration.length > 0) {
    throw new AppError(400, 'You are already registered for this course');
  }

  // Generate registration number
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const registrationNumber = `REG${timestamp}${random}`;

  const [newReg] = await db.insert(registrations).values({
    userId: req.user.id,
    scheduleId: scheduleId,
    registrationNumber,
    status: 'PENDING',
    paymentStatus: 'PENDING',
  }).returning();

  // Update course schedule (capacity and enrollment)
  await db.update(courseSchedules)
    .set({
      enrollmentCount: sql`${courseSchedules.enrollmentCount} + 1`,
      capacityRemaining: schedule.capacityRemaining ? sql`${courseSchedules.capacityRemaining} - 1` : undefined
    })
    .where(eq(courseSchedules.id, scheduleId));

  const response = formatResponse(
    true,
    newReg,
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

  const { skip, limit: pageLimit, page: pageNum } = paginate(
    parseInt(page as string),
    parseInt(limit as string)
  );

  const conditions = [eq(registrations.userId, req.user.id)];
  if (status) {
    conditions.push(eq(registrations.status, String(status)));
  }

  const whereClause = and(...conditions);

  const results = await db.select({
    id: registrations.id,
    registrationNumber: registrations.registrationNumber,
    status: registrations.status,
    paymentStatus: registrations.paymentStatus,
    amountPaid: registrations.amountPaid,
    currency: registrations.currency,
    createdAt: registrations.createdAt,
    courseId: courseSchedules.id,
    courseName: courses.name,
    mentor: courseSchedules.mentor,
    startDate: courseSchedules.startDate,
    endDate: courseSchedules.endDate,
  })
    .from(registrations)
    .innerJoin(courseSchedules, eq(registrations.scheduleId, courseSchedules.id))
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .where(whereClause)
    .limit(pageLimit)
    .offset(skip)
    .orderBy(desc(registrations.createdAt));

  const countResults = await db.select({ count: count() })
    .from(registrations)
    .where(whereClause);

  const total = Number(countResults[0].count);

  const response = formatResponse(
    true,
    {
      registrations: results,
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

  const registrationId = parseInt(req.params.registrationId);

  const results = await db.select({
    registration: registrations,
    schedule: courseSchedules,
    course: courses,
    user: users
  })
    .from(registrations)
    .innerJoin(courseSchedules, eq(registrations.scheduleId, courseSchedules.id))
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .innerJoin(users, eq(registrations.userId, users.id))
    .where(and(eq(registrations.id, registrationId), eq(registrations.userId, req.user.id)))
    .limit(1);

  if (results.length === 0) {
    throw new AppError(404, 'Registration not found');
  }

  const { registration, schedule, course, user } = results[0];
  const combined = {
    ...registration,
    courseId: schedule.id,
    courseName: course.name,
    mentor: schedule.mentor,
    startDate: schedule.startDate,
    endDate: schedule.endDate,
    batchType: schedule.batchType,
    courseType: schedule.courseType,
    pricing: schedule.pricing,
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    }
  };

  const response = formatResponse(true, combined, 'Registration details retrieved successfully', 200);
  res.status(200).json(response);
});

/**
 * Process Payment
 */
export const processPayment = asyncHandler(async (req: CustomRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'User not authenticated');
  }

  const { paymentId, amountPaid, currency = 'INR' } = req.body;
  const registrationId = parseInt(req.params.registrationId);

  if (!paymentId || !amountPaid) {
    throw new AppError(400, 'Payment details are required');
  }

  const results = await db.select().from(registrations).where(and(eq(registrations.id, registrationId), eq(registrations.userId, req.user.id))).limit(1);

  if (results.length === 0) {
    throw new AppError(404, 'Registration not found');
  }

  const registration = results[0];

  if (registration.paymentStatus === 'PAID') {
    throw new AppError(400, 'Payment already processed');
  }

  const [updated] = await db.update(registrations)
    .set({
      paymentId,
      amountPaid: amountPaid.toString(),
      currency,
      paymentStatus: 'PAID',
      status: 'CONFIRMED',
      transactionDate: new Date(),
      updatedAt: new Date()
    })
    .where(eq(registrations.id, registrationId))
    .returning();

  const response = formatResponse(
    true,
    updated,
    'Payment processed successfully. Registration confirmed!',
    200
  );

  res.status(200).json(response);
});

/**
 * Cancel Registration
 */
export const cancelRegistration = asyncHandler(async (req: CustomRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'User not authenticated');
  }

  const registrationId = parseInt(req.params.registrationId);

  const results = await db.select()
    .from(registrations)
    .where(and(eq(registrations.id, registrationId), eq(registrations.userId, req.user.id)))
    .limit(1);

  if (results.length === 0) {
    throw new AppError(404, 'Registration not found');
  }

  const reg = results[0];
  if (reg.status === 'CANCELLED') {
    throw new AppError(400, 'Registration is already cancelled');
  }

  const scheduleResults = await db.select().from(courseSchedules).where(eq(courseSchedules.id, reg.scheduleId)).limit(1);
  const schedule = scheduleResults[0];

  if (schedule && new Date() > new Date(schedule.startDate)) {
    throw new AppError(400, 'Cannot cancel course after it has started');
  }

  await db.update(registrations)
    .set({
      status: 'CANCELLED',
      updatedAt: new Date()
    })
    .where(eq(registrations.id, reg.id));

  // Update schedule counts
  if (schedule) {
    await db.update(courseSchedules)
      .set({
        enrollmentCount: sql`${courseSchedules.enrollmentCount} - 1`,
        capacityRemaining: schedule.capacityRemaining ? sql`${courseSchedules.capacityRemaining} + 1` : undefined
      })
      .where(eq(courseSchedules.id, schedule.id));
  }

  const response = formatResponse(true, null, 'Registration cancelled successfully', 200);
  res.status(200).json(response);
});
