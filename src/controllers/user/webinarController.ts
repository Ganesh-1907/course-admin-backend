import { Response } from 'express';
import { and, asc, count, desc, eq, ilike, or } from 'drizzle-orm';
import { db, mentors, webinars } from '../../models';
import { asyncHandler } from '../../middleware/errorHandler';
import { CustomRequest } from '../../types/common';
import { formatResponse, paginate } from '../../utils/helpers';

const getMentorDetails = async (mentorId?: number | null) => {
  if (!mentorId) return null;

  const [mentor] = await db.select({
    id: mentors.id,
    name: mentors.name,
    designation: mentors.designation,
    specialization: mentors.specialization,
    photoUrl: mentors.photoUrl,
  })
    .from(mentors)
    .where(eq(mentors.id, mentorId))
    .limit(1);

  return mentor || null;
};

export const getAllWebinars = asyncHandler(async (req: CustomRequest, res: Response) => {
  const {
    page = 1,
    limit = 25,
    search,
    location,
    sortBy = 'webinarDate',
    order = 'ASC',
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
  const sortDirection = String(order).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const webinarRows = await db.select()
    .from(webinars)
    .where(whereClause)
    .limit(pageLimit)
    .offset(skip)
    .orderBy(
      sortDirection === 'ASC' ? asc(orderColumn) : desc(orderColumn),
    );

  // Enhance webinars with mentor details
  const enhancedWebinars = await Promise.all(
    webinarRows.map(async (webinar) => {
      const primaryMentor = await getMentorDetails(webinar.primaryMentorId);
      return {
        ...webinar,
        primaryMentor,
      };
    })
  );

  const totalResults = await db.select({ count: count() })
    .from(webinars)
    .where(whereClause);

  const response = formatResponse(
    true,
    {
      webinars: enhancedWebinars,
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
    return res.status(400).json(formatResponse(false, null, 'Invalid webinar ID', 400));
  }

  const [webinar] = await db.select()
    .from(webinars)
    .where(eq(webinars.id, webinarId))
    .limit(1);

  if (!webinar) {
    return res.status(404).json(formatResponse(false, null, 'Webinar not found', 404));
  }

  const primaryMentor = await getMentorDetails(webinar.primaryMentorId);
  const secondaryMentor = await getMentorDetails(webinar.secondaryMentorId);

  res.status(200).json(formatResponse(
    true,
    {
      ...webinar,
      primaryMentor,
      secondaryMentor,
    },
    'Webinar retrieved successfully',
    200
  ));
});
