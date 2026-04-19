import { Response } from 'express';
import { and, asc, count, desc, eq, ilike, or } from 'drizzle-orm';
import { db, careers, jobApplications } from '../../models';
import { asyncHandler } from '../../middleware/errorHandler';
import { CustomRequest } from '../../types/common';
import { formatResponse, paginate } from '../../utils/helpers';

export const getAllCareers = asyncHandler(async (req: CustomRequest, res: Response) => {
  const {
    page = 1,
    limit = 10,
    search,
    department,
    location,
    type,
    sortBy = 'createdAt',
    order = 'DESC',
  } = req.query;

  const { skip, limit: pageLimit, page: pageNum } = paginate(
    parseInt(page as string, 10),
    parseInt(limit as string, 10),
  );

  const conditions = [eq(careers.status, 'OPEN')];
  const normalizedSearch = String(search ?? '').trim();

  if (normalizedSearch) {
    const searchPattern = `%${normalizedSearch}%`;
    conditions.push(or(
      ilike(careers.title, searchPattern),
      ilike(careers.description, searchPattern),
      ilike(careers.department, searchPattern),
    ));
  }

  if (department && department !== 'All') {
    conditions.push(eq(careers.department, String(department)));
  }

  if (location && location !== 'All') {
    conditions.push(eq(careers.location, String(location)));
  }

  if (type && type !== 'All') {
    conditions.push(eq(careers.type, String(type)));
  }

  const whereClause = and(...conditions);
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

  const response = formatResponse(
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
  );

  res.status(200).json(response);
});

export const getCareerById = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { id } = req.params;
  const careerId = Number.parseInt(id as string, 10);

  if (Number.isNaN(careerId)) {
    return res.status(400).json(formatResponse(false, null, 'Invalid career ID', 400));
  }

  const [career] = await db.select()
    .from(careers)
    .where(eq(careers.id, careerId))
    .limit(1);

  if (!career) {
    return res.status(404).json(formatResponse(false, null, 'Career not found', 404));
  }

  res.status(200).json(formatResponse(
    true,
    career,
    'Career retrieved successfully',
    200
  ));
});

export const applyForJob = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { jobId, fullName, email, phoneNumber, coverLetter } = req.body;
  const careerId = Number.parseInt(jobId as string, 10);

  if (Number.isNaN(careerId)) {
    return res.status(400).json(formatResponse(false, null, 'Invalid job ID', 400));
  }

  // Check if job exists and is open
  const [career] = await db.select()
    .from(careers)
    .where(and(eq(careers.id, careerId), eq(careers.status, 'OPEN')))
    .limit(1);

  if (!career) {
    return res.status(404).json(formatResponse(false, null, 'Job not found or closed', 404));
  }

  // Handle file upload
  let resumeUrl = '';
  if (req.file) {
    // Assuming file is uploaded via middleware and available in req.file
    // For local storage, we might store the path or a URL
    resumeUrl = `/uploads/resumes/${req.file.filename}`;
  } else {
    return res.status(400).json(formatResponse(false, null, 'Resume is required', 400));
  }

  const [newApplication] = await db.insert(jobApplications).values({
    jobId: careerId,
    fullName,
    email,
    phoneNumber,
    resumeUrl,
    coverLetter,
    status: 'PENDING',
  }).returning();

  res.status(201).json(formatResponse(
    true,
    newApplication,
    'Application submitted successfully',
    201
  ));
});

export const getDepartments = asyncHandler(async (req: CustomRequest, res: Response) => {
  const departmentRows = await db.selectDistinct({ department: careers.department })
    .from(careers)
    .where(eq(careers.status, 'OPEN'));

  const departments = departmentRows.map(row => row.department);

  res.status(200).json(formatResponse(
    true,
    departments,
    'Departments retrieved successfully',
    200
  ));
});
