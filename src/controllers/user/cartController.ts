import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../../middleware/errorHandler';
import { formatResponse } from '../../utils/helpers';
// import { Course } from '../../models'; // TODO: Uncomment when courses are seeded in DB

/**
 * Add item to cart
 *
 * Currently: Accepts dummy data directly from the frontend and stores it in the session.
 * No DB lookup is performed — courses are not yet in the database.
 *
 * TODO: When courses are ready in the DB, uncomment the DB lookup block below
 *       and remove the direct passthrough logic.
 */
export const addToCart = asyncHandler(async (req: Request, res: Response) => {
  const { courseId, courseName, price, discountedPrice, image } = req.body;

  if (!courseName) {
    throw new AppError(400, 'courseName is required');
  }

  // -----------------------------------------------------------------
  // TODO: UNCOMMENT THIS BLOCK WHEN COURSES ARE IN THE DB
  // -----------------------------------------------------------------
  // let course = null;
  //
  // // Try to find by MongoDB _id first
  // if (courseId) {
  //   try {
  //     course = await Course.findById(courseId);
  //   } catch (_) {
  //     // Not a valid ObjectId — will try by name
  //   }
  // }
  //
  // // Fallback: find by courseName (case-insensitive)
  // if (!course && courseName) {
  //   course = await Course.findOne({
  //     courseName: { $regex: new RegExp(`^${courseName}$`, 'i') },
  //     isActive: true,
  //   });
  // }
  //
  // if (!course) {
  //   throw new AppError(404, 'Course not found in database');
  // }
  // -----------------------------------------------------------------

  // Initialize cart if it doesn't exist
  if (!req.session.cart) {
    req.session.cart = [];
  }

  // Use courseId if provided, otherwise fall back to courseName as the unique key
  const cartKey = courseId || courseName;

  // Prevent duplicate entries
  const existingItem = req.session.cart.find(item => item.courseId === cartKey);
  if (existingItem) {
    return res
      .status(200)
      .json(formatResponse(true, req.session.cart, 'Course already in cart', 200));
  }

  // Store dummy data directly from the frontend into the session cart
  req.session.cart.push({
    courseId: cartKey,
    courseName,
    price: price || 0,
    discountedPrice: discountedPrice || price || 0,
    image: image || undefined,

    // TODO: Replace the above with DB values when courses are available:
    // courseId: course._id.toString(),
    // courseName: course.courseName,
    // price: course.price,
    // discountedPrice: course.finalPrice,
    // image: course.courseImage?.url,
  });

  res
    .status(200)
    .json(formatResponse(true, req.session.cart, 'Course added to cart successfully', 200));
});

/**
 * Get cart items
 */
export const getCart = asyncHandler(async (req: Request, res: Response) => {
  const cart = req.session.cart || [];
  res.status(200).json(formatResponse(true, cart, 'Cart retrieved successfully', 200));
});

/**
 * Remove item from cart
 */
export const removeFromCart = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.params;

  if (!req.session.cart) {
    return res.status(200).json(formatResponse(true, [], 'Cart is empty', 200));
  }

  req.session.cart = req.session.cart.filter(item => item.courseId !== courseId);

  res
    .status(200)
    .json(formatResponse(true, req.session.cart, 'Course removed from cart successfully', 200));
});

/**
 * Clear cart
 */
export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  req.session.cart = [];
  res.status(200).json(formatResponse(true, [], 'Cart cleared successfully', 200));
});
