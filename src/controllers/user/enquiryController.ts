import { Response } from 'express';
import { eq } from 'drizzle-orm';
import { CustomRequest } from '../../types/common';
import { db, enquiries } from '../../models';
import { formatResponse } from '../../utils/helpers';
import { asyncHandler, AppError } from '../../middleware/errorHandler';
import { sendEnquiryEmail } from '../../utils/emailService';

/**
 * Submit an enquiry
 */
export const submitEnquiry = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { 
    fullName, 
    email, 
    phone, 
    phoneNumber, 
    education, 
    courseId, 
    courseName, 
    subject,
    message, 
    type, 
    enquiryType,
    city 
  } = req.body;

  console.log('[Enquiry] Incoming submission:', req.body);

  const finalPhone = phone || phoneNumber;
  if (!fullName || !email || !finalPhone) {
    throw new AppError(400, 'Full name, email and phone number are required');
  }

  const finalEnquiryType = (type || enquiryType || 'GENERAL').toUpperCase();
  const finalCourseName = courseName || subject;
  const finalMessage = city ? `City: ${city}. ${message || ''}` : message;

  const courseIdInt = (courseId && !isNaN(parseInt(courseId))) ? parseInt(courseId) : null;

  const newEnquiryData = {
    fullName,
    email,
    phoneNumber: finalPhone,
    education,
    courseId: courseIdInt,
    courseName: finalCourseName,
    message: finalMessage,
    enquiryType: finalEnquiryType,
  };

  const newEnquiry = await db.insert(enquiries).values(newEnquiryData).returning();

  // Send emails
  try {
    await sendEnquiryEmail(newEnquiryData);
  } catch (emailError) {
    console.error('[Enquiry] Email sending failed:', emailError);
    // We don't throw here to avoid failing the whole request since DB insert succeeded
  }

  const response = formatResponse(
    true,
    newEnquiry[0],
    'Enquiry submitted successfully',
    201
  );

  res.status(201).json(response);
});

/**
 * Get all enquiries (for admin, but placing here for now or will move later)
 */
export const getAllEnquiries = asyncHandler(async (req: CustomRequest, res: Response) => {
  const results = await db.select().from(enquiries).orderBy(enquiries.createdAt);
  const response = formatResponse(true, results, 'Enquiries retrieved successfully', 200);
  res.status(200).json(response);
});

/**
 * Update an enquiry (for admin)
 */
export const updateEnquiry = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { id } = req.params;
  const { status, contactedAt, adminNotes } = req.body;

  const updatedEnquiry = await db.update(enquiries)
    .set({
      status,
      contactedAt: contactedAt ? new Date(contactedAt) : undefined,
      adminNotes,
      updatedAt: new Date(),
    })
    .where(eq(enquiries.id, parseInt(id)))
    .returning();

  if (!updatedEnquiry.length) {
    throw new AppError(404, 'Enquiry not found');
  }

  const response = formatResponse(true, updatedEnquiry[0], 'Enquiry updated successfully', 200);
  res.status(200).json(response);
});
