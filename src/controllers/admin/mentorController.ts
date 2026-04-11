import { Response } from 'express';
import { db, mentors } from '../../models';
import { and, asc, count, desc, eq, ilike, or } from 'drizzle-orm';
import { CustomRequest } from '../../types/common';
import { AppError, asyncHandler } from '../../middleware/errorHandler';
import { formatResponse, paginate } from '../../utils/helpers';

const normalizeRequiredText = (value: unknown, fieldName: string) => {
  const normalizedValue = String(value ?? '').trim();

  if (!normalizedValue) {
    throw new AppError(400, `${fieldName} is required`);
  }

  return normalizedValue;
};

const normalizeOptionalText = (value: unknown) => {
  const normalizedValue = String(value ?? '').trim();
  return normalizedValue ? normalizedValue : null;
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
  if (['true', '1', 'yes', 'y'].includes(normalizedValue)) return true;
  if (['false', '0', 'no', 'n'].includes(normalizedValue)) return false;

  return undefined;
};

const parseRating = (value: unknown) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return undefined;
  }

  const parsedRating = Number(value);

  if (!Number.isFinite(parsedRating) || parsedRating < 0 || parsedRating > 5) {
    throw new AppError(400, 'Rating must be a number between 0 and 5');
  }

  return parsedRating.toFixed(1);
};

const parseYearsOfExperience = (value: unknown) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new AppError(400, 'Years of experience is required');
  }

  const parsedYears = Number(value);

  if (!Number.isInteger(parsedYears) || parsedYears < 0) {
    throw new AppError(400, 'Years of experience must be a whole number greater than or equal to 0');
  }

  return parsedYears;
};

const mapMentorRecord = (mentor: typeof mentors.$inferSelect) => ({
  ...mentor,
  rating: mentor.rating !== null && mentor.rating !== undefined ? Number(mentor.rating) : null,
});

const parseMentorId = (mentorIdParam: string) => {
  const mentorId = parseInt(mentorIdParam, 10);

  if (Number.isNaN(mentorId)) {
    throw new AppError(400, 'Invalid mentor ID');
  }

  return mentorId;
};

const findMentorById = async (mentorId: number) => {
  const [mentor] = await db.select()
    .from(mentors)
    .where(eq(mentors.id, mentorId))
    .limit(1);

  return mentor ? mapMentorRecord(mentor) : null;
};

export const getAllMentors = asyncHandler(async (req: CustomRequest, res: Response) => {
  const {
    page = 1,
    limit = 25,
    search,
    isActive,
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
      ilike(mentors.name, searchPattern),
      ilike(mentors.specialization, searchPattern),
      ilike(mentors.designation, searchPattern),
    ));
  }

  const parsedIsActive = parseOptionalBoolean(isActive);
  if (parsedIsActive !== undefined) {
    conditions.push(eq(mentors.isActive, parsedIsActive));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  let orderColumn: typeof mentors.createdAt | typeof mentors.updatedAt | typeof mentors.name | typeof mentors.rating | typeof mentors.yearsOfExperience = mentors.createdAt;
  if (sortBy === 'updatedAt') orderColumn = mentors.updatedAt;
  if (sortBy === 'name') orderColumn = mentors.name;
  if (sortBy === 'rating') orderColumn = mentors.rating;
  if (sortBy === 'yearsOfExperience') orderColumn = mentors.yearsOfExperience;

  const sortDirection = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const mentorRows = await db.select()
    .from(mentors)
    .where(whereClause)
    .limit(pageLimit)
    .offset(skip)
    .orderBy(
      sortDirection === 'ASC' ? asc(orderColumn) : desc(orderColumn),
      sortDirection === 'ASC' ? asc(mentors.id) : desc(mentors.id),
    );

  const totalResults = await db.select({ count: count() })
    .from(mentors)
    .where(whereClause);

  const response = formatResponse(
    true,
    {
      mentors: mentorRows.map(mapMentorRecord),
      pagination: {
        page: pageNum,
        limit: pageLimit,
        total: Number(totalResults[0].count),
        pages: Math.ceil(Number(totalResults[0].count) / pageLimit),
      },
    },
    'Mentors retrieved successfully',
    200,
  );

  res.status(200).json(response);
});

export const getMentorById = asyncHandler(async (req: CustomRequest, res: Response) => {
  const mentorId = parseMentorId(req.params.mentorId);
  const mentor = await findMentorById(mentorId);

  if (!mentor) {
    throw new AppError(404, 'Mentor not found');
  }

  const response = formatResponse(true, mentor, 'Mentor retrieved successfully', 200);
  res.status(200).json(response);
});

export const createMentor = asyncHandler(async (req: CustomRequest, res: Response) => {
  const mentorInsertData: typeof mentors.$inferInsert = {
    name: normalizeRequiredText(req.body.name, 'Name'),
    specialization: normalizeRequiredText(req.body.specialization, 'Specialization'),
    designation: normalizeRequiredText(req.body.designation, 'Designation'),
    description: normalizeOptionalText(req.body.description),
    yearsOfExperience: parseYearsOfExperience(req.body.yearsOfExperience),
    linkedinId: normalizeOptionalText(req.body.linkedinId),
    photoUrl: normalizeOptionalText(req.body.photoUrl),
    isActive: parseOptionalBoolean(req.body.isActive) ?? true,
  };

  const parsedRating = parseRating(req.body.rating);
  if (parsedRating !== undefined) {
    mentorInsertData.rating = parsedRating;
  }

  const [createdMentor] = await db.insert(mentors).values(mentorInsertData).returning();

  const response = formatResponse(
    true,
    mapMentorRecord(createdMentor),
    'Mentor created successfully',
    201,
  );

  res.status(201).json(response);
});

export const updateMentor = asyncHandler(async (req: CustomRequest, res: Response) => {
  const mentorId = parseMentorId(req.params.mentorId);
  const currentMentor = await findMentorById(mentorId);

  if (!currentMentor) {
    throw new AppError(404, 'Mentor not found');
  }

  const updateData: Partial<typeof mentors.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (req.body.name !== undefined) {
    updateData.name = normalizeRequiredText(req.body.name, 'Name');
  }

  if (req.body.specialization !== undefined) {
    updateData.specialization = normalizeRequiredText(req.body.specialization, 'Specialization');
  }

  if (req.body.designation !== undefined) {
    updateData.designation = normalizeRequiredText(req.body.designation, 'Designation');
  }

  if (req.body.description !== undefined) {
    updateData.description = normalizeOptionalText(req.body.description);
  }

  if (req.body.yearsOfExperience !== undefined) {
    updateData.yearsOfExperience = parseYearsOfExperience(req.body.yearsOfExperience);
  }

  if (req.body.linkedinId !== undefined) {
    updateData.linkedinId = normalizeOptionalText(req.body.linkedinId);
  }

  if (req.body.photoUrl !== undefined) {
    updateData.photoUrl = normalizeOptionalText(req.body.photoUrl);
  }

  if (req.body.rating !== undefined) {
    updateData.rating = parseRating(req.body.rating) ?? null;
  }

  const parsedIsActive = parseOptionalBoolean(req.body.isActive);
  if (parsedIsActive !== undefined) {
    updateData.isActive = parsedIsActive;
  }

  await db.update(mentors)
    .set(updateData)
    .where(eq(mentors.id, mentorId));

  const updatedMentor = await findMentorById(mentorId);

  const response = formatResponse(
    true,
    updatedMentor,
    'Mentor updated successfully',
    200,
  );

  res.status(200).json(response);
});
