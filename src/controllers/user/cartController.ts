import { Response, NextFunction } from 'express';
import { CustomRequest } from '../../types/common';
import { db, courseSchedules, courses, mentors, cartItems } from '../../models';
import { eq, inArray, and } from 'drizzle-orm';
import { formatResponse } from '../../utils/helpers';
import { AppError, asyncHandler } from '../../middleware/errorHandler';

/**
 * Get Cart Items Details
 */
export const getCart = asyncHandler(async (req: CustomRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    req.session.cart = [];
    return res.status(200).json(formatResponse(true, [], 'Cart is empty', 200));
  }

  const dbCart = await db.select({
    scheduleId: cartItems.scheduleId
  })
    .from(cartItems)
    .where(eq(cartItems.userId, req.user.id));

  const scheduleIds = dbCart.map(item => item.scheduleId);

  if (scheduleIds.length === 0) {
    return res.status(200).json(formatResponse(true, [], 'Cart is empty', 200));
  }

  const results = await db.select({
    id: courseSchedules.id,
    courseName: courses.name,
    mentor: mentors.name,
    mentorId: mentors.id,
    mentorPhotoUrl: mentors.photoUrl,
    startDate: courseSchedules.startDate,
    endDate: courseSchedules.endDate,
    pricing: courseSchedules.pricing,
    brochureUrl: courseSchedules.brochureUrl,
    planAvailable: courseSchedules.planAvailable,
  })
    .from(courseSchedules)
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .innerJoin(mentors, eq(courseSchedules.mentorId, mentors.id))
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
export const addToCart = asyncHandler(async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { courseId } = req.body; // This is scheduleId

  if (!req.user) {
    throw new AppError(401, 'Please login to add courses to cart');
  }

  if (!courseId) {
    throw new AppError(400, 'Course schedule ID is required');
  }

  const scheduleId = typeof courseId === 'string' ? parseInt(courseId) : courseId;

  // Verify course exists
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

  // Save to database for logged-in user
  const existing = await db.select()
    .from(cartItems)
    .where(and(
      eq(cartItems.userId, req.user.id),
      eq(cartItems.scheduleId, scheduleId)
    ))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(cartItems).values({
      userId: req.user.id,
      scheduleId: scheduleId
    });
  }

  // Return the updated cart from DB
  return getCart(req, res, () => { });
});

/**
 * Remove From Cart
 */
export const removeFromCart = asyncHandler(async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { courseId } = req.params;

  if (!req.user) {
    throw new AppError(401, 'Please login to manage cart');
  }

  if (!courseId) {
    throw new AppError(400, 'Course ID is required');
  }

  const scheduleId = parseInt(courseId);

  // Remove from database
  await db.delete(cartItems)
    .where(and(
      eq(cartItems.userId, req.user.id),
      eq(cartItems.scheduleId, scheduleId)
    ));

  return getCart(req, res, next);
});

/**
 * Clear Cart
 */
export const clearCart = asyncHandler(async (req: CustomRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    req.session.cart = [];
    return res.status(200).json(formatResponse(true, [], 'Cart cleared', 200));
  }

  await db.delete(cartItems).where(eq(cartItems.userId, req.user.id));
  const response = formatResponse(true, [], 'Cart cleared', 200);
  res.status(200).json(response);
});

/**
 * Validate Promo Code (Placeholder)
 */
export const validatePromoCode = asyncHandler(async (req: CustomRequest, res: Response, next: NextFunction) => {
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
