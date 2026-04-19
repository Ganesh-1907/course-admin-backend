import { Response } from 'express';
import { and, asc, count, desc, eq, ilike, or } from 'drizzle-orm';
import { db, careers, jobApplications } from '../../models';
import { asyncHandler } from '../../middleware/errorHandler';
import { CustomRequest } from '../../types/common';
import { formatResponse, paginate } from '../../utils/helpers';

export const getAllCareers = asyncHandler(async (req: CustomRequest, res: Response) => {
  const {
    page = 1,
    limit = 25,
    search,
    status,
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
      ilike(careers.title, searchPattern),
      ilike(careers.department, searchPattern),
    ));
  }

  if (status && status !== 'All') {
    conditions.push(eq(careers.status, String(status)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const orderColumn = sortBy === 'title' ? careers.title : careers.createdAt;
  const sortDirection = String(order).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const careerRows = await db.select()
    .from(careers)
    .where(whereClause)
    .limit(pageLimit)
    .offset(skip)
    .orderBy(
      sortDirection === 'ASC' ? asc(orderColumn) : desc(orderColumn),
    );

  const totalResults = await db.select({ count: count() })
    .from(careers)
    .where(whereClause);

  res.status(200).json(formatResponse(
    true,
    {
      careers: careerRows,
      pagination: {
        page: pageNum,
        limit: pageLimit,
        total: Number(totalResults[0].count),
        pages: Math.ceil(Number(totalResults[0].count) / pageLimit),
      },
    },
    'Careers retrieved successfully',
    200,
  ));
});

export const createCareer = asyncHandler(async (req: CustomRequest, res: Response) => {
  const {
    title,
    department,
    location,
    type,
    description,
    requirements,
    responsibilities,
    salaryRange,
    status,
    isFeatured,
  } = req.body;

  const [newCareer] = await db.insert(careers).values({
    title,
    department,
    location,
    type,
    description,
    requirements,
    responsibilities,
    salaryRange,
    status: status || 'OPEN',
    isFeatured: isFeatured || false,
  }).returning();

  res.status(201).json(formatResponse(true, newCareer, 'Career created successfully', 201));
});

export const updateCareer = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { id } = req.params;
  const careerId = Number.parseInt(id as string, 10);

  if (Number.isNaN(careerId)) {
    return res.status(400).json(formatResponse(false, null, 'Invalid career ID', 400));
  }

  const updateData = { ...req.body, updatedAt: new Date() };

  const [updatedCareer] = await db.update(careers)
    .set(updateData)
    .where(eq(careers.id, careerId))
    .returning();

  if (!updatedCareer) {
    return res.status(404).json(formatResponse(false, null, 'Career not found', 404));
  }

  res.status(200).json(formatResponse(true, updatedCareer, 'Career updated successfully', 200));
});

export const deleteCareer = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { id } = req.params;
  const careerId = Number.parseInt(id as string, 10);

  if (Number.isNaN(careerId)) {
    return res.status(400).json(formatResponse(false, null, 'Invalid career ID', 400));
  }

  const [deletedCareer] = await db.delete(careers)
    .where(eq(careers.id, careerId))
    .returning();

  if (!deletedCareer) {
    return res.status(404).json(formatResponse(false, null, 'Career not found', 404));
  }

  res.status(200).json(formatResponse(true, null, 'Career deleted successfully', 200));
});

export const getAllApplications = asyncHandler(async (req: CustomRequest, res: Response) => {
  const {
    page = 1,
    limit = 25,
    jobId,
    status,
  } = req.query;

  const { skip, limit: pageLimit, page: pageNum } = paginate(
    parseInt(page as string, 10),
    parseInt(limit as string, 10),
  );

  const conditions = [];
  if (jobId) {
    conditions.push(eq(jobApplications.jobId, Number(jobId)));
  }
  if (status) {
    conditions.push(eq(jobApplications.status, String(status)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const applications = await db.select({
    id: jobApplications.id,
    jobId: jobApplications.jobId,
    jobTitle: careers.title,
    fullName: jobApplications.fullName,
    email: jobApplications.email,
    phoneNumber: jobApplications.phoneNumber,
    resumeUrl: jobApplications.resumeUrl,
    coverLetter: jobApplications.coverLetter,
    status: jobApplications.status,
    createdAt: jobApplications.createdAt,
  })
    .from(jobApplications)
    .leftJoin(careers, eq(jobApplications.jobId, careers.id))
    .where(whereClause)
    .limit(pageLimit)
    .offset(skip)
    .orderBy(desc(jobApplications.createdAt));

  const totalResults = await db.select({ count: count() })
    .from(jobApplications)
    .where(whereClause);

  res.status(200).json(formatResponse(
    true,
    {
      applications,
      pagination: {
        page: pageNum,
        limit: pageLimit,
        total: Number(totalResults[0].count),
        pages: Math.ceil(Number(totalResults[0].count) / pageLimit),
      },
    },
    'Applications retrieved successfully',
    200,
  ));
});

export const updateApplicationStatus = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const appId = Number.parseInt(id as string, 10);

  if (Number.isNaN(appId)) {
    return res.status(400).json(formatResponse(false, null, 'Invalid application ID', 400));
  }

  const [updatedApp] = await db.update(jobApplications)
    .set({ status, updatedAt: new Date() })
    .where(eq(jobApplications.id, appId))
    .returning();

  if (!updatedApp) {
    return res.status(404).json(formatResponse(false, null, 'Application not found', 404));
  }

  res.status(200).json(formatResponse(true, updatedApp, 'Application status updated successfully', 200));
});
