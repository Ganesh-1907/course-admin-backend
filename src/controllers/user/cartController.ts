import { Response } from 'express';
import { CustomRequest } from '../../types/common';
import { db, courseSchedules, courses } from '../../models';
import { eq, inArray, and } from 'drizzle-orm';
import { formatResponse } from '../../utils/helpers';
import { AppError, asyncHandler } from '../../middleware/errorHandler';

/**
 * Get Cart Items Details
 */
export const getCart = asyncHandler(async (req: CustomRequest, res: Response) => {
  const cart = req.session.cart || [];

  if (cart.length === 0) {
    return res.status(200).json(formatResponse(true, [], 'Cart is empty', 200));
  }

  const scheduleIds = cart.map(item => typeof item.courseId === 'string' ? parseInt(item.courseId) : item.courseId);

  const results = await db.select({
    id: courseSchedules.id,
    courseName: courses.name,
    mentor: courseSchedules.mentor,
    startDate: courseSchedules.startDate,
    endDate: courseSchedules.endDate,
    pricing: courseSchedules.pricing,
    brochureUrl: courseSchedules.brochureUrl,
  })
    .from(courseSchedules)
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .where(and(
      inArray(courseSchedules.id, scheduleIds),
      eq(courseSchedules.isActive, true)
    ));

  const response = formatResponse(true, results, 'Cart details retrieved successfully', 200);
  res.status(200).json(response);
});

/**
 * Add To Cart
 */
export const addToCart = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { courseId } = req.body; // This is scheduleId

  if (!courseId) {
    throw new AppError(400, 'Course schedule ID is required');
  }

  const scheduleId = typeof courseId === 'string' ? parseInt(courseId) : courseId;

  // Fetch course details to store in session
  const results = await db.select({
    id: courseSchedules.id,
    name: courses.name,
    pricing: courseSchedules.pricing,
  })
    .from(courseSchedules)
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .where(eq(courseSchedules.id, scheduleId))
    .limit(1);

  if (results.length === 0) {
    throw new AppError(404, 'Course not found');
  }

  const schedule = results[0];

  if (!req.session.cart) {
    req.session.cart = [];
  }

  const exists = req.session.cart.find(item => item.courseId === scheduleId);
  if (!exists) {
    req.session.cart.push({
      courseId: schedule.id,
      courseName: schedule.name,
      pricing: schedule.pricing
    });
  }

  const response = formatResponse(true, req.session.cart, 'Course added to cart', 200);
  res.status(200).json(response);
});

/**
 * Remove From Cart
 */
export const removeFromCart = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { courseId } = req.params;

  if (!courseId) {
    throw new AppError(400, 'Course ID is required');
  }

  const scheduleId = parseInt(courseId);

  if (req.session.cart) {
    req.session.cart = req.session.cart.filter(item => item.courseId !== scheduleId);
  }

  const response = formatResponse(true, req.session.cart || [], 'Course removed from cart', 200);
  res.status(200).json(response);
});

/**
 * Clear Cart
 */
export const clearCart = asyncHandler(async (req: CustomRequest, res: Response) => {
  req.session.cart = [];
  const response = formatResponse(true, [], 'Cart cleared', 200);
  res.status(200).json(response);
});

/**
 * Validate Promo Code (Placeholder)
 */
export const validatePromoCode = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { code, courseId } = req.body;

  if (!code || !courseId) {
    throw new AppError(400, 'Promo code and Course ID are required');
  }

  const response = formatResponse(true, {
    valid: false,
    message: 'Invalid or expired promo code'
  }, 'Promo code validation complete', 200);

  res.status(200).json(response);
});
