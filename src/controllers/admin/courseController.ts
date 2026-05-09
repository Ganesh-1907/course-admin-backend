import { Response } from 'express';
import XLSX from 'xlsx';
import { CustomRequest } from '../../types/common';
import {
  db,
  courses,
  courseSchedules,
  mentors,
  mentorCourseMappings,
  serviceTypes,
} from '../../models';
import {
  eq,
  and,
  ilike,
  or,
  desc,
  asc,
  count,
} from 'drizzle-orm';
import { paginate, formatResponse } from '../../utils/helpers';
import { AppError, asyncHandler } from '../../middleware/errorHandler';

const DEFAULT_MENTOR_PHOTO_URL = 'https://course-management-assets.s3.ap-south-1.amazonaws.com/mentors/default-mentor.jpg';
const SUPPORTED_PRICING_IMPORT_COLUMNS = [
  {
    country: 'USA',
    currency: 'USD',
    feeKeys: ['feeusa'],
    discountKeys: ['discountusa'],
    finalPriceKeys: ['priceusa'],
  },
  {
    country: 'Canada',
    currency: 'CAD',
    feeKeys: ['feecanada', 'feecanadian'],
    discountKeys: ['discountcanada', 'discountcanadian'],
    finalPriceKeys: ['pricecanada', 'pricecanadian'],
  },
  {
    country: 'Europe',
    currency: 'EUR',
    feeKeys: ['feeeurope'],
    discountKeys: ['discounteurope'],
    finalPriceKeys: ['priceeurope'],
  },
  {
    country: 'India',
    currency: 'INR',
    feeKeys: ['feeindia'],
    discountKeys: ['discountindia'],
    finalPriceKeys: ['priceindia'],
  },
  {
    country: 'Australia',
    currency: 'AUD',
    feeKeys: ['feeaustralia'],
    discountKeys: ['discountaustralia'],
    finalPriceKeys: ['priceaustralia'],
  },
  {
    country: 'Singapore',
    currency: 'SGD',
    feeKeys: ['feesingapore'],
    discountKeys: ['discountsingapore'],
    finalPriceKeys: ['pricesingapore'],
  },
] as const;

type NormalizedSheetRow = Record<string, unknown>;

type ImportCourseLookupRow = {
  id: number;
  name: string;
  serviceType: string | null;
};

type ImportMentorLookupRow = {
  courseId: number;
  mentorId: number;
  mentorName: string;
};

const scheduleSelectFields = {
  scheduleId: courseSchedules.id,
  courseId: courses.id,
  courseName: courses.name,
  serviceType: serviceTypes.name,
  mentorId: mentors.id,
  mentorName: mentors.name,
  mentorSpecialization: mentors.specialization,
  mentorDesignation: mentors.designation,
  mentorDescription: mentors.description,
  mentorRating: mentors.rating,
  mentorYearsOfExperience: mentors.yearsOfExperience,
  mentorLinkedinId: mentors.linkedinId,
  mentorPhotoUrl: mentors.photoUrl,
  startDate: courseSchedules.startDate,
  endDate: courseSchedules.endDate,
  startTime: courseSchedules.startTime,
  endTime: courseSchedules.endTime,
  batchType: courseSchedules.batchType,
  courseType: courseSchedules.courseType,
  address: courseSchedules.address,
  language: courseSchedules.language,
  description: courseSchedules.description,
  difficultyLevel: courseSchedules.difficultyLevel,
  duration: courseSchedules.duration,
  brochureUrl: courseSchedules.brochureUrl,
  pricing: courseSchedules.pricing,
  maxParticipants: courseSchedules.maxParticipants,
  capacityRemaining: courseSchedules.capacityRemaining,
  enrollmentCount: courseSchedules.enrollmentCount,
  planAvailable: courseSchedules.planAvailable,
  isActive: courseSchedules.isActive,
  createdAt: courseSchedules.createdAt,
  updatedAt: courseSchedules.updatedAt,
};

const parseOptionalBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
    return undefined;
  }
  if (typeof value !== 'string') return undefined;
  const normalizedValue = value.trim().toLowerCase();
  if (['true', 'yes', 'y', '1'].includes(normalizedValue)) return true;
  if (['false', 'no', 'n', '0'].includes(normalizedValue)) return false;
  return undefined;
};

const parsePricingPayload = (value: unknown) => {
  if (typeof value === 'string') {
    return JSON.parse(value);
  }
  return value;
};

const normalizeLookupValue = (value: unknown) =>
  String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

const normalizeColumnKey = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

const normalizeSheetRow = (row: Record<string, unknown>): NormalizedSheetRow =>
  Object.entries(row).reduce<NormalizedSheetRow>((accumulator, [key, value]) => {
    accumulator[normalizeColumnKey(key)] = value;
    return accumulator;
  }, {});

const getRowValue = (row: NormalizedSheetRow, keys: readonly string[]) => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      return row[key];
    }
  }
  return undefined;
};

const normalizeOptionalText = (value: unknown) => {
  if (value === undefined || value === null) return null;
  const normalizedValue = String(value).trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
};

const parseIntegerField = (value: unknown, fieldName: string) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }

  const parsedValue = Number(String(value).trim());
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${fieldName} must be a positive whole number`);
  }

  return parsedValue;
};

const parseBooleanField = (value: unknown, fieldName: string) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return undefined;
  }

  const parsedValue = parseOptionalBoolean(value);
  if (parsedValue === undefined) {
    throw new Error(`${fieldName} must be true or false`);
  }

  return parsedValue;
};

const padDatePart = (value: number) => String(value).padStart(2, '0');

const formatDateValue = (value: Date) =>
  `${value.getFullYear()}-${padDatePart(value.getMonth() + 1)}-${padDatePart(value.getDate())}`;

const parseExcelDate = (value: unknown) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }

  if (value instanceof Date) {
    return formatDateValue(value);
  }

  if (typeof value === 'number') {
    const parsedDate = XLSX.SSF.parse_date_code(value);
    if (!parsedDate) {
      return null;
    }

    return `${parsedDate.y}-${padDatePart(parsedDate.m)}-${padDatePart(parsedDate.d)}`;
  }

  const normalizedValue = String(value).trim();
  const matchedDate = normalizedValue.match(/^(\d{4}-\d{2}-\d{2})/);
  if (matchedDate?.[1]) {
    return matchedDate[1];
  }

  const parsedDate = new Date(normalizedValue);
  return Number.isNaN(parsedDate.getTime()) ? null : formatDateValue(parsedDate);
};

const parseExcelTime = (value: unknown) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }

  if (value instanceof Date) {
    return `${padDatePart(value.getHours())}:${padDatePart(value.getMinutes())}`;
  }

  if (typeof value === 'number') {
    const parsedTime = XLSX.SSF.parse_date_code(value);
    if (!parsedTime) {
      return null;
    }

    return `${padDatePart(parsedTime.H)}:${padDatePart(parsedTime.M)}`;
  }

  const normalizedValue = String(value).trim().toUpperCase();
  const matchedTime = normalizedValue.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);

  if (!matchedTime) {
    return null;
  }

  let hours = parseInt(matchedTime[1], 10);
  const minutes = parseInt(matchedTime[2], 10);
  const meridiem = matchedTime[3];

  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return `${padDatePart(hours)}:${padDatePart(minutes)}`;
};

const normalizeDifficultyLevel = (value: unknown) => {
  const normalizedValue = normalizeLookupValue(value);

  if (normalizedValue === 'beginner') return 'Beginner';
  if (normalizedValue === 'intermediate') return 'Intermediate';
  if (normalizedValue === 'advanced') return 'Advanced';

  return null;
};

const normalizeBatchType = (value: unknown) => {
  const normalizedValue = normalizeLookupValue(value).replace(/\s+/g, ' ');

  if (normalizedValue === 'weekend' || normalizedValue === 'weekends') return 'WEEKEND';
  if (normalizedValue === 'weekday' || normalizedValue === 'weekdays') return 'WEEKDAY';
  if (normalizedValue === 'fast track' || normalizedValue === 'fasttrack') return 'FAST TRACK';

  return null;
};

const normalizeCourseType = (value: unknown) => {
  const normalizedValue = normalizeLookupValue(value);

  if (normalizedValue === 'online') return 'ONLINE';
  if (normalizedValue === 'offline') return 'OFFLINE';

  return null;
};

const buildImportedPricing = (row: NormalizedSheetRow) =>
  SUPPORTED_PRICING_IMPORT_COLUMNS.map((market) => {
    const basePrice = Number(getRowValue(row, market.feeKeys) || 0);
    const discountPercentage = Number(getRowValue(row, market.discountKeys) || 0);
    const finalPriceValue = getRowValue(row, market.finalPriceKeys);
    const calculatedFinalPrice = basePrice - (basePrice * discountPercentage) / 100;
    const finalPrice = finalPriceValue === undefined || finalPriceValue === null || String(finalPriceValue).trim() === ''
      ? Number(calculatedFinalPrice.toFixed(2))
      : Number(finalPriceValue);

    return {
      country: market.country,
      currency: market.currency,
      price: Number.isFinite(basePrice) ? basePrice : 0,
      discountPercentage: Number.isFinite(discountPercentage) ? discountPercentage : 0,
      finalPrice: Number.isFinite(finalPrice) ? finalPrice : 0,
    };
  });

const mapScheduleRow = (row: any) => ({
  id: row.scheduleId,
  courseId: row.courseId,
  courseName: row.courseName,
  serviceType: row.serviceType,
  mentorId: row.mentorId,
  mentor: row.mentorName,
  mentorProfile: {
    id: row.mentorId,
    name: row.mentorName,
    specialization: row.mentorSpecialization,
    designation: row.mentorDesignation,
    description: row.mentorDescription,
    rating: row.mentorRating !== null && row.mentorRating !== undefined ? Number(row.mentorRating) : null,
    yearsOfExperience: row.mentorYearsOfExperience,
    linkedinId: row.mentorLinkedinId,
    photoUrl: row.mentorPhotoUrl || DEFAULT_MENTOR_PHOTO_URL,
  },
  startDate: row.startDate,
  endDate: row.endDate,
  startTime: row.startTime,
  endTime: row.endTime,
  batchType: row.batchType,
  courseType: row.courseType,
  address: row.address,
  language: row.language,
  description: row.description,
  difficultyLevel: row.difficultyLevel,
  duration: row.duration,
  brochureUrl: row.brochureUrl,
  brochure: row.brochureUrl ? { url: row.brochureUrl } : null,
  pricing: row.pricing,
  countryPricing: row.pricing,
  maxParticipants: row.maxParticipants,
  capacityRemaining: row.capacityRemaining,
  enrollmentCount: row.enrollmentCount,
  planAvailable: row.planAvailable,
  isActive: row.isActive,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const getScheduleById = async (scheduleId: number) => {
  const results = await db.select(scheduleSelectFields)
    .from(courseSchedules)
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .innerJoin(mentors, eq(courseSchedules.mentorId, mentors.id))
    .leftJoin(serviceTypes, eq(courses.serviceTypeId, serviceTypes.id))
    .where(eq(courseSchedules.id, scheduleId))
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  return mapScheduleRow(results[0]);
};

const ensureMentorMappedToCourse = async (courseId: number, mentorId: number) => {
  const courseResult = await db.select({ id: courses.id })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);

  if (courseResult.length === 0) {
    throw new AppError(404, 'Selected course was not found');
  }

  const mentorResult = await db.select({ id: mentors.id })
    .from(mentors)
    .where(eq(mentors.id, mentorId))
    .limit(1);

  if (mentorResult.length === 0) {
    throw new AppError(404, 'Selected mentor was not found');
  }

  const mappingResult = await db.select({ id: mentorCourseMappings.id })
    .from(mentorCourseMappings)
    .where(and(
      eq(mentorCourseMappings.courseId, courseId),
      eq(mentorCourseMappings.mentorId, mentorId),
    ))
    .limit(1);

  if (mappingResult.length === 0) {
    throw new AppError(400, 'Selected mentor is not mapped to the selected course');
  }
};

/**
 * Create Course Schedule
 */
export const createCourse = asyncHandler(async (req: CustomRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'User not authenticated');
  }

  const {
    courseId,
    mentorId,
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
    isActive,
    planAvailable,
  } = req.body;

  const normalizedCourseId = Number(courseId);
  const normalizedMentorId = Number(mentorId);
  const finalPricing = countryPricing ? parsePricingPayload(countryPricing) : parsePricingPayload(pricing);
  let parsedMaxParticipants: number | null;
  try {
    parsedMaxParticipants = parseIntegerField(maxParticipants, 'Max participants');
  } catch (error) {
    throw new AppError(400, error instanceof Error ? error.message : 'Invalid max participants value');
  }

  if (!normalizedCourseId || !normalizedMentorId || !startDate || !endDate || !finalPricing) {
    throw new AppError(400, 'Missing required fields');
  }

  if (Number.isNaN(normalizedCourseId) || Number.isNaN(normalizedMentorId)) {
    throw new AppError(400, 'Invalid course or mentor selection');
  }

  if (new Date(startDate) >= new Date(endDate)) {
    throw new AppError(400, 'Start date must be before end date');
  }

  await ensureMentorMappedToCourse(normalizedCourseId, normalizedMentorId);

  let brochureUrl;
  if (req.file) {
    brochureUrl = `${req.protocol}://${req.get('host')}/uploads/brochures/${req.file.filename}`;
  }

  const [insertedSchedule] = await db.insert(courseSchedules).values({
    courseId: normalizedCourseId,
    mentorId: normalizedMentorId,
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
    duration: duration ? parseInt(String(duration), 10) : null,
    maxParticipants: parsedMaxParticipants,
    capacityRemaining: parsedMaxParticipants,
    pricing: finalPricing,
    createdBy: req.user.id,
    brochureUrl,
    isActive: parseOptionalBoolean(isActive) ?? true,
    planAvailable: parseOptionalBoolean(planAvailable) ?? true,
  }).returning({ id: courseSchedules.id });

  const schedule = await getScheduleById(insertedSchedule.id);
  const response = formatResponse(true, schedule, 'Course schedule created successfully', 201);
  res.status(201).json(response);
});

/**
 * Update Course Schedule
 */
export const updateCourse = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { courseId } = req.params;
  const scheduleId = parseInt(courseId, 10);

  if (Number.isNaN(scheduleId)) {
    throw new AppError(400, 'Invalid course schedule ID');
  }

  const scheduleResults = await db.select()
    .from(courseSchedules)
    .where(eq(courseSchedules.id, scheduleId))
    .limit(1);

  if (scheduleResults.length === 0) {
    throw new AppError(404, 'Course schedule not found');
  }

  const currentSchedule = scheduleResults[0];
  const nextCourseId = req.body.courseId ? parseInt(String(req.body.courseId), 10) : currentSchedule.courseId;
  const nextMentorId = req.body.mentorId ? parseInt(String(req.body.mentorId), 10) : currentSchedule.mentorId;

  if (Number.isNaN(nextCourseId) || Number.isNaN(nextMentorId)) {
    throw new AppError(400, 'Invalid course or mentor selection');
  }

  const startDate = new Date(req.body.startDate || currentSchedule.startDate);
  const endDate = new Date(req.body.endDate || currentSchedule.endDate);
  if (startDate >= endDate) {
    throw new AppError(400, 'Start date must be before end date');
  }

  await ensureMentorMappedToCourse(nextCourseId, nextMentorId);

  let brochureUrl = currentSchedule.brochureUrl;
  if (req.file) {
    brochureUrl = `${req.protocol}://${req.get('host')}/uploads/brochures/${req.file.filename}`;
  }

  const updateData: Record<string, any> = {
    updatedAt: new Date(),
    brochureUrl,
  };
  let parsedMaxParticipants: number | null | undefined;
  if (req.body.maxParticipants !== undefined) {
    try {
      parsedMaxParticipants = parseIntegerField(req.body.maxParticipants, 'Max participants');
    } catch (error) {
      throw new AppError(400, error instanceof Error ? error.message : 'Invalid max participants value');
    }
  }

  if (req.body.courseId !== undefined) updateData.courseId = nextCourseId;
  if (req.body.mentorId !== undefined) updateData.mentorId = nextMentorId;
  if (req.body.startDate) updateData.startDate = startDate.toISOString().split('T')[0];
  if (req.body.endDate) updateData.endDate = endDate.toISOString().split('T')[0];
  if (req.body.startTime !== undefined) updateData.startTime = req.body.startTime;
  if (req.body.endTime !== undefined) updateData.endTime = req.body.endTime;
  if (req.body.batchType !== undefined) updateData.batchType = req.body.batchType;
  if (req.body.courseType !== undefined) updateData.courseType = req.body.courseType;
  if (req.body.address !== undefined) updateData.address = req.body.address;
  if (req.body.language !== undefined) updateData.language = req.body.language;
  if (req.body.description !== undefined) updateData.description = req.body.description;
  if (req.body.difficultyLevel !== undefined) updateData.difficultyLevel = req.body.difficultyLevel;
  if (req.body.duration !== undefined) updateData.duration = req.body.duration ? parseInt(String(req.body.duration), 10) : null;
  if (parsedMaxParticipants !== undefined) {
    if (
      parsedMaxParticipants !== null
      && currentSchedule.enrollmentCount !== null
      && currentSchedule.enrollmentCount !== undefined
      && parsedMaxParticipants < currentSchedule.enrollmentCount
    ) {
      throw new AppError(400, 'Max participants cannot be less than the current enrollment count');
    }

    updateData.maxParticipants = parsedMaxParticipants;
    updateData.capacityRemaining = parsedMaxParticipants === null
      ? null
      : Math.max(parsedMaxParticipants - (currentSchedule.enrollmentCount || 0), 0);
  }

  const parsedIsActive = parseOptionalBoolean(req.body.isActive);
  if (parsedIsActive !== undefined) updateData.isActive = parsedIsActive;

  const parsedPlanAvailable = parseOptionalBoolean(req.body.planAvailable);
  if (parsedPlanAvailable !== undefined) updateData.planAvailable = parsedPlanAvailable;

  if (req.body.countryPricing !== undefined || req.body.pricing !== undefined) {
    updateData.pricing = req.body.countryPricing !== undefined
      ? parsePricingPayload(req.body.countryPricing)
      : parsePricingPayload(req.body.pricing);
  }

  await db.update(courseSchedules)
    .set(updateData)
    .where(eq(courseSchedules.id, scheduleId));

  const schedule = await getScheduleById(scheduleId);
  const response = formatResponse(true, schedule, 'Course schedule updated successfully', 200);
  res.status(200).json(response);
});

/**
 * Get All Course Schedules
 */
export const getAllCourses = asyncHandler(async (req: CustomRequest, res: Response) => {
  const {
    page = 1,
    limit = 25,
    search,
    serviceType,
    batchType,
    courseType,
    sortBy = 'courseId',
    order = 'ASC',
  } = req.query;

  const { skip, limit: pageLimit, page: pageNum } = paginate(
    parseInt(page as string, 10),
    parseInt(limit as string, 10),
  );

  const conditions = [];

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

  if (batchType && batchType !== 'All' && batchType !== 'All Batches') {
    conditions.push(ilike(courseSchedules.batchType, `%${batchType}%`));
  }

  if (courseType && courseType !== 'All' && courseType !== 'All Types') {
    conditions.push(ilike(courseSchedules.courseType, `%${courseType}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  let orderColumn: any = courseSchedules.id;
  if (sortBy === 'createdAt') orderColumn = courseSchedules.createdAt;
  if (sortBy === 'mentor') orderColumn = mentors.name;
  if (sortBy === 'courseName') orderColumn = courses.name;

  const rows = await db.select(scheduleSelectFields)
    .from(courseSchedules)
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .innerJoin(mentors, eq(courseSchedules.mentorId, mentors.id))
    .leftJoin(serviceTypes, eq(courses.serviceTypeId, serviceTypes.id))
    .where(whereClause)
    .limit(pageLimit)
    .offset(skip)
    .orderBy(order === 'DESC' ? desc(orderColumn) : asc(orderColumn));

  const totalResults = await db.select({ count: count() })
    .from(courseSchedules)
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .innerJoin(mentors, eq(courseSchedules.mentorId, mentors.id))
    .leftJoin(serviceTypes, eq(courses.serviceTypeId, serviceTypes.id))
    .where(whereClause);

  const response = formatResponse(
    true,
    {
      courses: rows.map(mapScheduleRow),
      pagination: {
        page: pageNum,
        limit: pageLimit,
        total: Number(totalResults[0].count),
        pages: Math.ceil(Number(totalResults[0].count) / pageLimit),
      },
    },
    'Courses retrieved successfully',
    200,
  );

  res.status(200).json(response);
});

/**
 * Get Course Schedule By ID
 */
export const getCourseById = asyncHandler(async (req: CustomRequest, res: Response) => {
  const scheduleId = parseInt(req.params.courseId, 10);

  if (Number.isNaN(scheduleId)) {
    throw new AppError(400, 'Invalid course schedule ID');
  }

  const course = await getScheduleById(scheduleId);

  if (!course) {
    throw new AppError(404, 'Course not found');
  }

  const response = formatResponse(true, course, 'Course retrieved successfully', 200);
  res.status(200).json(response);
});

/**
 * Delete Course Schedule
 */
export const deleteCourse = asyncHandler(async (req: CustomRequest, res: Response) => {
  const scheduleId = parseInt(req.params.courseId, 10);

  if (Number.isNaN(scheduleId)) {
    throw new AppError(400, 'Invalid course schedule ID');
  }

  await db.delete(courseSchedules).where(eq(courseSchedules.id, scheduleId));

  const response = formatResponse(true, null, 'Course schedule deleted successfully', 200);
  res.status(200).json(response);
});

/**
 * Activate/Deactivate Course Schedule
 */
export const activateCourse = asyncHandler(async (req: CustomRequest, res: Response) => {
  const scheduleId = parseInt(req.params.courseId, 10);

  if (Number.isNaN(scheduleId)) {
    throw new AppError(400, 'Invalid course schedule ID');
  }

  await db.update(courseSchedules).set({ isActive: true, updatedAt: new Date() }).where(eq(courseSchedules.id, scheduleId));
  const response = formatResponse(true, null, 'Course activated successfully', 200);
  res.status(200).json(response);
});

export const deactivateCourse = asyncHandler(async (req: CustomRequest, res: Response) => {
  const scheduleId = parseInt(req.params.courseId, 10);

  if (Number.isNaN(scheduleId)) {
    throw new AppError(400, 'Invalid course schedule ID');
  }

  await db.update(courseSchedules).set({ isActive: false, updatedAt: new Date() }).where(eq(courseSchedules.id, scheduleId));
  const response = formatResponse(true, null, 'Course deactivated successfully', 200);
  res.status(200).json(response);
});

/**
 * Import Courses
 */
export const importCourses = asyncHandler(async (req: CustomRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'User not authenticated');
  }

  if (!req.file?.buffer) {
    throw new AppError(400, 'Import file is required');
  }

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new AppError(400, 'The uploaded workbook does not contain any sheets');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    raw: true,
  });

  if (rows.length === 0) {
    throw new AppError(400, 'No data rows found in the uploaded file');
  }

  const MAX_IMPORT_ROWS = 500;
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new AppError(400, `Import is limited to ${MAX_IMPORT_ROWS} rows at a time`);
  }

  const courseLookup = await db.select({
    id: courses.id,
    name: courses.name,
    serviceType: serviceTypes.name,
  })
    .from(courses)
    .leftJoin(serviceTypes, eq(courses.serviceTypeId, serviceTypes.id));

  const mentorLookup = await db.select({
    courseId: mentorCourseMappings.courseId,
    mentorId: mentors.id,
    mentorName: mentors.name,
  })
    .from(mentorCourseMappings)
    .innerJoin(mentors, eq(mentorCourseMappings.mentorId, mentors.id))
    .where(eq(mentors.isActive, true));

  const mentorsByCourse = mentorLookup.reduce<Map<number, ImportMentorLookupRow[]>>((accumulator, mentor) => {
    const existing = accumulator.get(mentor.courseId) || [];
    existing.push(mentor);
    accumulator.set(mentor.courseId, existing);
    return accumulator;
  }, new Map());

  let importedCount = 0;
  const errors: string[] = [];

  for (const [index, rawRow] of rows.entries()) {
    const rowNumber = index + 2;

    try {
      const row = normalizeSheetRow(rawRow);
      const courseName = normalizeOptionalText(getRowValue(row, ['coursename']));
      const serviceTypeName = normalizeOptionalText(getRowValue(row, ['servicetype']));
      const mentorName = normalizeOptionalText(getRowValue(row, ['mentor']));
      const description = normalizeOptionalText(getRowValue(row, ['description']));
      const difficultyLevel = normalizeDifficultyLevel(getRowValue(row, ['difficultylevel']));
      const startDate = parseExcelDate(getRowValue(row, ['startdate']));
      const endDate = parseExcelDate(getRowValue(row, ['enddate']));
      const duration = parseIntegerField(getRowValue(row, ['duration']), 'Duration');
      const language = normalizeOptionalText(getRowValue(row, ['language'])) || 'English';
      const startTime = parseExcelTime(getRowValue(row, ['starttime']));
      const endTime = parseExcelTime(getRowValue(row, ['endtime']));
      const batchType = normalizeBatchType(getRowValue(row, ['batchtype']));
      const courseType = normalizeCourseType(getRowValue(row, ['coursetype']));
      const address = normalizeOptionalText(getRowValue(row, ['address']));
      const brochureUrl = normalizeOptionalText(getRowValue(row, ['brochure', 'brochureurl']));
      const maxParticipants = parseIntegerField(getRowValue(row, ['maxparticipants']), 'Max participants');
      const planAvailable = parseBooleanField(getRowValue(row, ['planavailable']), 'Plan available') ?? true;
      const isActive = parseBooleanField(getRowValue(row, ['isactive']), 'Is active') ?? true;
      const pricing = buildImportedPricing(row);

      if (!courseName) throw new Error('Course name is required');
      if (!mentorName) throw new Error('Mentor is required');
      if (!description) throw new Error('Description is required');
      if (!difficultyLevel) throw new Error('Difficulty level must be Beginner, Intermediate, or Advanced');
      if (!startDate) throw new Error('Start date is required in YYYY-MM-DD format');
      if (!endDate) throw new Error('End date is required in YYYY-MM-DD format');
      if (!duration) throw new Error('Duration is required');
      if (!startTime) throw new Error('Start time is required in HH:MM format');
      if (!endTime) throw new Error('End time is required in HH:MM format');
      if (!batchType) throw new Error('Batch type must be WEEKEND, WEEKDAY, or FAST TRACK');
      if (!courseType) throw new Error('Course type must be ONLINE or OFFLINE');
      if (courseType === 'OFFLINE' && !address) throw new Error('Address is required for offline schedules');
      if (!pricing.some((price) => price.price > 0)) throw new Error('At least one pricing row is required');
      if (new Date(startDate) >= new Date(endDate)) throw new Error('Start date must be before end date');

      const courseNameKey = normalizeLookupValue(courseName);
      const serviceTypeKey = normalizeLookupValue(serviceTypeName);
      const matchingCourses = (courseLookup as ImportCourseLookupRow[]).filter((course) => {
        if (normalizeLookupValue(course.name) !== courseNameKey) {
          return false;
        }

        if (!serviceTypeKey) {
          return true;
        }

        return normalizeLookupValue(course.serviceType) === serviceTypeKey;
      });

      if (matchingCourses.length === 0) {
        throw new Error(
          serviceTypeName
            ? `Course "${courseName}" with service type "${serviceTypeName}" was not found`
            : `Course "${courseName}" was not found`,
        );
      }

      if (matchingCourses.length > 1) {
        throw new Error(`Multiple courses matched "${courseName}". Please include a precise service type.`);
      }

      const selectedCourse = matchingCourses[0];
      const availableMentors = mentorsByCourse.get(selectedCourse.id) || [];
      const matchingMentors = availableMentors.filter(
        (mentor) => normalizeLookupValue(mentor.mentorName) === normalizeLookupValue(mentorName),
      );

      if (matchingMentors.length === 0) {
        throw new Error(`Mentor "${mentorName}" is not mapped to course "${selectedCourse.name}"`);
      }

      if (matchingMentors.length > 1) {
        throw new Error(`Multiple mapped mentors matched "${mentorName}" for "${selectedCourse.name}"`);
      }

      await db.insert(courseSchedules).values({
        courseId: selectedCourse.id,
        mentorId: matchingMentors[0].mentorId,
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
        brochureUrl,
        pricing,
        maxParticipants,
        capacityRemaining: maxParticipants,
        planAvailable,
        isActive,
        createdBy: req.user.id,
      });

      importedCount += 1;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown import error';
      errors.push(`Row ${rowNumber}: ${errorMessage}`);
    }
  }

  const totalRows = rows.length;
  const failedCount = totalRows - importedCount;
  const statusCode = importedCount > 0 ? 200 : 400;
  const message = importedCount === 0
    ? 'No valid rows found in the uploaded file'
    : failedCount > 0
      ? 'Courses imported with some skipped rows'
      : 'Courses imported successfully';

  const response = formatResponse(importedCount > 0, {
    totalRows,
    importedCount,
    failedCount,
    errors,
  }, message, statusCode);

  res.status(statusCode).json(response);
});

/**
 * Get Course Catalog
 */
export const getCourseCatalog = asyncHandler(async (_req: CustomRequest, res: Response) => {
  const results = await db.select({
    id: courses.id,
    name: courses.name,
    serviceType: serviceTypes.name,
  })
    .from(courses)
    .leftJoin(serviceTypes, eq(courses.serviceTypeId, serviceTypes.id))
    .orderBy(asc(courses.name));

  const response = formatResponse(true, results, 'Course catalog retrieved successfully', 200);
  res.status(200).json(response);
});

/**
 * Get Mentors For Selected Course
 */
export const getMentorsByCourse = asyncHandler(async (req: CustomRequest, res: Response) => {
  const selectedCourseId = parseInt(req.params.courseId, 10);

  if (Number.isNaN(selectedCourseId)) {
    throw new AppError(400, 'Invalid course ID');
  }

  const results = await db.select({
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
      eq(mentorCourseMappings.courseId, selectedCourseId),
      eq(mentors.isActive, true),
    ))
    .orderBy(asc(mentors.name));

  const mentorOptions = results.map((mentor) => ({
    ...mentor,
    rating: mentor.rating !== null && mentor.rating !== undefined ? Number(mentor.rating) : null,
    photoUrl: mentor.photoUrl || DEFAULT_MENTOR_PHOTO_URL,
  }));

  const response = formatResponse(true, mentorOptions, 'Mentors retrieved successfully', 200);
  res.status(200).json(response);
});

/**
 * Get All Service Types
 */
export const getAllServiceTypes = asyncHandler(async (_req: CustomRequest, res: Response) => {
  const results = await db.select({
    id: serviceTypes.id,
    name: serviceTypes.name,
  }).from(serviceTypes)
    .orderBy(asc(serviceTypes.name));

  const response = formatResponse(true, results, 'Service types retrieved successfully', 200);
  res.status(200).json(response);
});
