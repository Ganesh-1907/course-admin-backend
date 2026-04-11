import { Response } from 'express';
import { eq, desc, ilike, or, and, count, SQL } from 'drizzle-orm';
import { CustomRequest } from '../../types/common';
import { db, enquiries } from '../../models';
import { formatResponse, paginate } from '../../utils/helpers';
import { asyncHandler, AppError } from '../../middleware/errorHandler';

/**
 * Get all enquiries with filtering, search, and pagination (Admin)
 */
export const getAllEnquiries = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { page = '1', limit = '10', search, status, enquiryType, sortBy = 'createdAt', order = 'desc' } = req.query;

  const { skip, limit: take, page: currentPage } = paginate(
    parseInt(page as string),
    parseInt(limit as string)
  );

  // Build where conditions
  const conditions: SQL[] = [];

  if (search) {
    const searchStr = `%${search}%`;
    conditions.push(
      or(
        ilike(enquiries.fullName, searchStr),
        ilike(enquiries.email, searchStr),
        ilike(enquiries.phoneNumber, searchStr),
        ilike(enquiries.courseName, searchStr)
      )!
    );
  }

  if (status && status !== 'ALL') {
    conditions.push(eq(enquiries.status, status as string));
  }

  if (enquiryType && enquiryType !== 'ALL') {
    conditions.push(eq(enquiries.enquiryType, enquiryType as string));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const totalResult = await db.select({ count: count() })
    .from(enquiries)
    .where(whereClause);
  const total = totalResult[0]?.count || 0;

  // Get paginated results
  const results = await db.select()
    .from(enquiries)
    .where(whereClause)
    .orderBy(desc(enquiries.createdAt))
    .limit(take)
    .offset(skip);

  const response = formatResponse(true, {
    enquiries: results,
    pagination: {
      total,
      page: currentPage,
      limit: take,
      pages: Math.ceil(total / take),
    },
  }, 'Enquiries retrieved successfully', 200);

  res.status(200).json(response);
});

/**
 * Get a single enquiry by ID (Admin)
 */
export const getEnquiryById = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { id } = req.params;

  const results = await db.select()
    .from(enquiries)
    .where(eq(enquiries.id, parseInt(id)))
    .limit(1);

  if (!results.length) {
    throw new AppError(404, 'Enquiry not found');
  }

  const response = formatResponse(true, results[0], 'Enquiry retrieved successfully', 200);
  res.status(200).json(response);
});

/**
 * Update an enquiry status/notes (Admin)
 */
export const updateEnquiry = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { id } = req.params;
  const { status, adminNotes, contactedAt } = req.body;

  const updateData: any = {
    updatedAt: new Date(),
  };

  if (status) updateData.status = status;
  if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
  if (contactedAt) updateData.contactedAt = new Date(contactedAt);

  // If status is CONTACTED and no contactedAt provided, auto-set it
  if (status === 'CONTACTED' && !contactedAt) {
    updateData.contactedAt = new Date();
  }

  const updatedEnquiry = await db.update(enquiries)
    .set(updateData)
    .where(eq(enquiries.id, parseInt(id)))
    .returning();

  if (!updatedEnquiry.length) {
    throw new AppError(404, 'Enquiry not found');
  }

  const response = formatResponse(true, updatedEnquiry[0], 'Enquiry updated successfully', 200);
  res.status(200).json(response);
});

/**
 * Delete an enquiry (Admin)
 */
export const deleteEnquiry = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { id } = req.params;

  const deleted = await db.delete(enquiries)
    .where(eq(enquiries.id, parseInt(id)))
    .returning();

  if (!deleted.length) {
    throw new AppError(404, 'Enquiry not found');
  }

  const response = formatResponse(true, null, 'Enquiry deleted successfully', 200);
  res.status(200).json(response);
});
