import { Response } from 'express';
import XLSX from 'xlsx';
import { CustomRequest } from '../../types/common';
import {
  db,
  registrations,
  courseSchedules,
  courses,
  mentors,
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

  const { skip, limit: pageLimit, page: pageNum } = paginate(
    parseInt(page as string),
    parseInt(limit as string)
  );

  const conditions = [];

  if (courseId) {
    conditions.push(eq(registrations.scheduleId, parseInt(courseId as string)));
  }

  if (status) {
    conditions.push(eq(registrations.status, status as string));
  }

  if (paymentStatus) {
    conditions.push(eq(registrations.paymentStatus, paymentStatus as string));
  }

  if (search) {
    const searchStr = `%${search}%`;
    conditions.push(or(
      ilike(users.name, searchStr),
      ilike(users.email, searchStr),
      ilike(courses.name, searchStr)
    ));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const results = await db.select({
    id: registrations.id,
    registrationNumber: registrations.registrationNumber,
    status: registrations.status,
    paymentStatus: registrations.paymentStatus,
    amountPaid: registrations.amountPaid,
    currency: registrations.currency,
    paymentGateway: registrations.paymentGateway,
    createdAt: registrations.createdAt,
    userId: users.id,
    userName: users.name,
    email: users.email,
    mobile: users.mobile,
    courseId: courseSchedules.id,
    courseName: courses.name,
    mentor: mentors.name,
    startDate: courseSchedules.startDate,
  })
    .from(registrations)
    .innerJoin(users, eq(registrations.userId, users.id))
    .innerJoin(courseSchedules, eq(registrations.scheduleId, courseSchedules.id))
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .innerJoin(mentors, eq(courseSchedules.mentorId, mentors.id))
    .where(whereClause)
    .limit(pageLimit)
    .offset(skip)
    .orderBy(desc(registrations.createdAt));

  const countResults = await db.select({ count: sql<number>`count(*)` })
    .from(registrations)
    .innerJoin(users, eq(registrations.userId, users.id))
    .innerJoin(courseSchedules, eq(registrations.scheduleId, courseSchedules.id))
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .innerJoin(mentors, eq(courseSchedules.mentorId, mentors.id))
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
export const getRegistrationDetail = asyncHandler(async (req: CustomRequest, res: Response) => {
  const registrationId = parseInt(req.params.registrationId);

  const results = await db.select({
    registration: registrations,
    user: users,
    schedule: courseSchedules,
    course: courses,
    mentor: mentors,
  })
    .from(registrations)
    .innerJoin(users, eq(registrations.userId, users.id))
    .innerJoin(courseSchedules, eq(registrations.scheduleId, courseSchedules.id))
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .innerJoin(mentors, eq(courseSchedules.mentorId, mentors.id))
    .where(eq(registrations.id, registrationId))
    .limit(1);

  if (results.length === 0) {
    throw new AppError(404, 'Registration not found');
  }

  const { registration, user, schedule, course, mentor } = results[0];
  const combined = {
    ...registration,
    userName: user.name,
    email: user.email,
    mobile: user.mobile,
    courseId: schedule.id,
    courseName: course.name,
    mentor: mentor.name,
    mentorId: mentor.id,
    mentorProfile: {
      id: mentor.id,
      name: mentor.name,
      specialization: mentor.specialization,
      designation: mentor.designation,
      rating: mentor.rating ? Number(mentor.rating) : null,
      yearsOfExperience: mentor.yearsOfExperience,
      linkedinId: mentor.linkedinId,
      photoUrl: mentor.photoUrl,
    },
    startDate: schedule.startDate,
    endDate: schedule.endDate,
    batchType: schedule.batchType,
    courseType: schedule.courseType,
    pricing: schedule.pricing,
  };

  const response = formatResponse(true, combined, 'Registration details retrieved successfully', 200);
  res.status(200).json(response);
});

/**
 * Update Registration Status
 */
export const updateRegistrationStatus = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { status, notes } = req.body;
  const registrationId = parseInt(req.params.registrationId);

  if (!status) {
    throw new AppError(400, 'Status is required');
  }

  const updated = await db.update(registrations)
    .set({
      status: status,
      notes: notes,
      updatedAt: new Date()
    })
    .where(eq(registrations.id, registrationId))
    .returning();

  if (updated.length === 0) {
    throw new AppError(404, 'Registration not found');
  }

  const response = formatResponse(true, updated[0], 'Registration status updated successfully', 200);
  res.status(200).json(response);
});


/**
 * Export Registrations to Excel
 */
export const exportRegistrations = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { startDate, endDate, status, paymentStatus, search, courseId } = req.query;
  const conditions = [];
  if (courseId) conditions.push(eq(registrations.scheduleId, parseInt(courseId as string)));
  if (status) conditions.push(eq(registrations.status, status as string));
  if (paymentStatus) conditions.push(eq(registrations.paymentStatus, paymentStatus as string));
  if (startDate) conditions.push(sql`${registrations.createdAt} >= ${new Date(startDate as string)}`);
  if (endDate) conditions.push(sql`${registrations.createdAt} <= ${new Date(endDate as string)}`);

  if (search) {
    const searchStr = `%${search}%`;
    conditions.push(or(
      ilike(users.name, searchStr),
      ilike(users.email, searchStr),
      ilike(courses.name, searchStr)
    ));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const results = await db.select({
    registrationNumber: registrations.registrationNumber,
    userName: users.name,
    email: users.email,
    mobile: users.mobile,
    courseName: courses.name,
    status: registrations.status,
    paymentStatus: registrations.paymentStatus,
    amountPaid: registrations.amountPaid,
    currency: registrations.currency,
    paymentId: registrations.paymentId,
    paymentGateway: registrations.paymentGateway,
    createdAt: registrations.createdAt
  })
    .from(registrations)
    .innerJoin(users, eq(registrations.userId, users.id))
    .innerJoin(courseSchedules, eq(registrations.scheduleId, courseSchedules.id))
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .where(whereClause)
    .orderBy(desc(registrations.createdAt));

  const data = results.map(reg => ({
    'Registration ID': reg.registrationNumber,
    'User Name': reg.userName,
    'Email': reg.email,
    'Mobile': reg.mobile,
    'Course Name': reg.courseName,
    'Status': reg.status,
    'Payment Status': reg.paymentStatus,
    'Amount Paid': reg.amountPaid,
    'Currency': reg.currency,
    'Payment ID': reg.paymentId,
    'Payment Gateway': reg.paymentGateway,
    'Registration Date': reg.createdAt ? new Date(reg.createdAt).toLocaleDateString() : 'N/A',
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');

  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename=Registrations.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(excelBuffer);
});

/**
 * Get Payment Details
 */
export const getPaymentDetails = asyncHandler(async (req: CustomRequest, res: Response) => {
  const registrationId = parseInt(req.params.registrationId);

  const results = await db.select().from(registrations).where(eq(registrations.id, registrationId)).limit(1);

  if (results.length === 0) {
    throw new AppError(404, 'Registration not found');
  }

  const reg = results[0];

  const paymentDetails = {
    registrationNumber: reg.registrationNumber,
    amountPaid: reg.amountPaid,
    paymentStatus: reg.paymentStatus,
    paymentId: reg.paymentId,
    transactionDate: reg.transactionDate,
    currency: reg.currency,
  };

  const response = formatResponse(true, paymentDetails, 'Payment details retrieved successfully', 200);
  res.status(200).json(response);
});
