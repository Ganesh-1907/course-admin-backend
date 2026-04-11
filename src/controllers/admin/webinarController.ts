import { Response } from 'express';
import { and, asc, count, desc, eq, ilike, or } from 'drizzle-orm';
import { db, mentors, webinars } from '../../models';
import { AppError, asyncHandler } from '../../middleware/errorHandler';
import { CustomRequest } from '../../types/common';
import { formatResponse, paginate } from '../../utils/helpers';

const ALLOWED_WEBINAR_LOCATIONS = [
  'USA',
  'Canada',
  'Europe',
  'India',
  'Australia',
  'Singapore',
] as const;

const normalizeRequiredText = (value: unknown, fieldName: string) => {
  const normalizedValue = String(value ?? '').trim();

  if (!normalizedValue) {
    throw new AppError(400, `${fieldName} is required`);
  }

  return normalizedValue;
};

const normalizeTimeValue = (value: unknown, fieldName: string) => {
  const normalizedValue = String(value ?? '').trim();

  if (!normalizedValue) {
    throw new AppError(400, `${fieldName} is required`);
  }

  const matchedTime = normalizedValue.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!matchedTime) {
    throw new AppError(400, `${fieldName} must be a valid time`);
  }

  return `${matchedTime[1]}:${matchedTime[2]}`;
};

const normalizeDateValue = (value: unknown, fieldName: string) => {
  const normalizedValue = String(value ?? '').trim();

  if (!normalizedValue) {
    throw new AppError(400, `${fieldName} is required`);
  }

  const matchedDate = normalizedValue.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!matchedDate?.[1]) {
    throw new AppError(400, `${fieldName} must be a valid date`);
  }

  return matchedDate[1];
};

const parseMentorId = (value: unknown, fieldName: string) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new AppError(400, `${fieldName} is required`);
  }

  const mentorId = Number(value);
  if (!Number.isInteger(mentorId) || mentorId <= 0) {
    throw new AppError(400, `${fieldName} must be a valid mentor`);
  }

  return mentorId;
};

const parseOptionalMentorId = (value: unknown) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }

  const mentorId = Number(value);
  if (!Number.isInteger(mentorId) || mentorId <= 0) {
    throw new AppError(400, 'Second mentor must be a valid mentor');
  }

  return mentorId;
};

const normalizeLocation = (value: unknown) => {
  const location = normalizeRequiredText(value, 'Webinar location');

  if (!ALLOWED_WEBINAR_LOCATIONS.includes(location as typeof ALLOWED_WEBINAR_LOCATIONS[number])) {
    throw new AppError(400, 'Webinar location is not supported');
  }

  return location;
};

const convertTimeToMinutes = (value: string) => {
  const [hours = '0', minutes = '0'] = value.split(':');
  return Number(hours) * 60 + Number(minutes);
};

const ensureMentorExists = async (mentorId: number, fieldName: string) => {
  const [mentor] = await db.select({ id: mentors.id })
    .from(mentors)
    .where(eq(mentors.id, mentorId))
    .limit(1);

  if (!mentor) {
    throw new AppError(404, `${fieldName} not found`);
  }
};

const getMentorDetails = async (mentorId?: number | null) => {
  if (!mentorId) return null;

  const [mentor] = await db.select({
    id: mentors.id,
    name: mentors.name,
    designation: mentors.designation,
    specialization: mentors.specialization,
  })
    .from(mentors)
    .where(eq(mentors.id, mentorId))
    .limit(1);

  return mentor || null;
};

export const createWebinar = asyncHandler(async (req: CustomRequest, res: Response) => {
  const primaryMentorId = parseMentorId(req.body.primaryMentorId, 'Primary mentor');
  const secondaryMentorId = parseOptionalMentorId(req.body.secondaryMentorId);
  const startTime = normalizeTimeValue(req.body.startTime, 'Start time');
  const endTime = normalizeTimeValue(req.body.endTime, 'End time');

  if (convertTimeToMinutes(endTime) <= convertTimeToMinutes(startTime)) {
    throw new AppError(400, 'End time must be after start time');
  }

  if (secondaryMentorId !== null && secondaryMentorId === primaryMentorId) {
    throw new AppError(400, 'Second mentor must be different from the primary mentor');
  }

  await ensureMentorExists(primaryMentorId, 'Primary mentor');
  if (secondaryMentorId !== null) {
    await ensureMentorExists(secondaryMentorId, 'Second mentor');
  }

  const webinarInsertData: typeof webinars.$inferInsert = {
    name: normalizeRequiredText(req.body.name, 'Webinar name'),
    description: normalizeRequiredText(req.body.description, 'Description'),
    startTime,
    endTime,
    webinarDate: normalizeDateValue(req.body.webinarDate, 'Webinar date'),
    posterUrl: normalizeRequiredText(req.body.posterUrl, 'Webinar poster URL'),
    location: normalizeLocation(req.body.location),
    primaryMentorId,
    secondaryMentorId,
  };

  const [createdWebinar] = await db.insert(webinars).values(webinarInsertData).returning();

  const response = formatResponse(
    true,
    createdWebinar,
    'Webinar created successfully',
    201,
  );

  res.status(201).json(response);
});

export const getAllWebinars = asyncHandler(async (req: CustomRequest, res: Response) => {
  const {
    page = 1,
    limit = 25,
    search,
    location,
    sortBy = 'createdAt',
    order = 'DESC',
  } = req.query;

  const { skip, limit: pageLimit, page: pageNum } = paginate(
    parseInt(page as string, 10),
    parseInt(limit as string, 10),
  );

  const conditions = [];
  const normalizedSearch = String(search ?? '').trim();

  if (normalizedSearch) {
    const searchPattern = `%${normalizedSearch}%`;
    conditions.push(or(
      ilike(webinars.name, searchPattern),
      ilike(webinars.description, searchPattern),
    ));
  }

  const normalizedLocation = String(location ?? '').trim();
  if (normalizedLocation && normalizedLocation !== 'All') {
    conditions.push(eq(webinars.location, normalizedLocation));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const orderColumn = sortBy === 'webinarDate' ? webinars.webinarDate : webinars.createdAt;
  const sortDirection = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const webinarRows = await db.select()
    .from(webinars)
    .where(whereClause)
    .limit(pageLimit)
    .offset(skip)
    .orderBy(
      sortDirection === 'ASC' ? asc(orderColumn) : desc(orderColumn),
      sortDirection === 'ASC' ? asc(webinars.id) : desc(webinars.id),
    );

  const totalResults = await db.select({ count: count() })
    .from(webinars)
    .where(whereClause);

  const response = formatResponse(
    true,
    {
      webinars: webinarRows,
      pagination: {
        page: pageNum,
        limit: pageLimit,
        total: Number(totalResults[0].count),
        pages: Math.ceil(Number(totalResults[0].count) / pageLimit),
      },
    },
    'Webinars retrieved successfully',
    200,
  );

  res.status(200).json(response);
});

export const getWebinarById = asyncHandler(async (req: CustomRequest, res: Response) => {
  const webinarId = Number.parseInt(req.params.webinarId, 10);

  if (Number.isNaN(webinarId)) {
    throw new AppError(400, 'Invalid webinar ID');
  }

  const [webinar] = await db.select()
    .from(webinars)
    .where(eq(webinars.id, webinarId))
    .limit(1);

  if (!webinar) {
    throw new AppError(404, 'Webinar not found');
  }

  const primaryMentor = await getMentorDetails(webinar.primaryMentorId);
  const secondaryMentor = await getMentorDetails(webinar.secondaryMentorId);

  const response = formatResponse(
    true,
    {
      ...webinar,
      primaryMentor,
      secondaryMentor,
    },
    'Webinar retrieved successfully',
    200,
  );

  res.status(200).json(response);
});
