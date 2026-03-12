import crypto from 'crypto';
import { Response } from 'express';
import { CustomRequest } from '../../types/common';
import { db, users, registrations, courseSchedules, courses } from '../../models';
import {
  eq,
  and,
  sql,
} from 'drizzle-orm';
import {
  generateToken,
  hashPassword,
  comparePassword,
  validateEmail,
  formatResponse,
} from '../../utils/helpers';
import { AppError, asyncHandler } from '../../middleware/errorHandler';

/**
 * User Register
 */
export const registerUser = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { name, email, password, confirmPassword, acceptTerms } = req.body;

  if (!name || !email || !password || !confirmPassword) {
    throw new AppError(400, 'All fields are required');
  }

  if (!validateEmail(email)) {
    throw new AppError(400, 'Invalid email format');
  }

  if (password !== confirmPassword) {
    throw new AppError(400, 'Passwords do not match');
  }

  if (password.length < 6) {
    throw new AppError(400, 'Password must be at least 6 characters');
  }

  if (!acceptTerms) {
    throw new AppError(400, 'You must accept the terms and conditions');
  }

  const existing = await db.select()
    .from(users)
    .where(eq(sql`LOWER(${users.email})`, email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    throw new AppError(400, 'Email already registered');
  }

  const hashedPassword = await hashPassword(password);

  const newUser = await db.insert(users).values({
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    role: 'participant',
    status: 'ACTIVE',
  }).returning();

  const user = newUser[0];

  const token = generateToken(user.id, 'participant');

  const response = formatResponse(
    true,
    {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
    'Registration successful',
    201
  );

  res.status(201).json(response);
});

/**
 * User Login
 */
export const loginUser = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError(400, 'Email and password are required');
  }

  if (!validateEmail(email)) {
    throw new AppError(400, 'Invalid email format');
  }

  const results = await db.select()
    .from(users)
    .where(eq(sql`LOWER(${users.email})`, email.toLowerCase()))
    .limit(1);

  const user = results[0];

  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  if (user.status !== 'ACTIVE') {
    throw new AppError(403, 'Account is inactive or suspended');
  }

  const isPasswordMatch = await comparePassword(password, user.password);

  if (!isPasswordMatch) {
    throw new AppError(401, 'Invalid email or password');
  }

  const token = generateToken(user.id, user.role || 'participant');

  const response = formatResponse(
    true,
    {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
    'Login successful',
    200
  );

  res.status(200).json(response);
});

/**
 * Get User Profile
 */
export const getUserProfile = asyncHandler(async (req: CustomRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'User not authenticated');
  }

  const userResults = await db.select()
    .from(users)
    .where(eq(users.id, req.user.id))
    .limit(1);

  const user = userResults[0];

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  // Fetch registered courses
  const registeredCourses = await db.select({
    id: registrations.id,
    registrationDate: registrations.createdAt,
    status: registrations.status,
    course: {
      id: courseSchedules.id,
      courseName: courses.name,
    }
  })
    .from(registrations)
    .innerJoin(courseSchedules, eq(registrations.scheduleId, courseSchedules.id))
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .where(eq(registrations.userId, req.user.id));

  const profile = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    registeredCourses
  };

  const response = formatResponse(true, profile, 'Profile retrieved successfully', 200);
  res.status(200).json(response);
});

/**
 * Update User Profile
 */
export const updateUserProfile = asyncHandler(async (req: CustomRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'User not authenticated');
  }

  const { name } = req.body;

  const updateData: any = {
    ...(name && { name }),
    updatedAt: new Date()
  };

  const updatedResults = await db.update(users)
    .set(updateData)
    .where(eq(users.id, req.user.id))
    .returning();

  const user = updatedResults[0];

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const response = formatResponse(true, user, 'Profile updated successfully', 200);
  res.status(200).json(response);
});

/**
 * Change Password
 */
export const changePassword = asyncHandler(async (req: CustomRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'User not authenticated');
  }

  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    throw new AppError(400, 'All fields are required');
  }

  if (newPassword !== confirmPassword) {
    throw new AppError(400, 'Passwords do not match');
  }

  if (newPassword.length < 6) {
    throw new AppError(400, 'Password must be at least 6 characters');
  }

  const results = await db.select()
    .from(users)
    .where(eq(users.id, req.user.id))
    .limit(1);

  const user = results[0];

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const isPasswordMatch = await comparePassword(currentPassword, user.password);

  if (!isPasswordMatch) {
    throw new AppError(401, 'Current password is incorrect');
  }

  const hashedPassword = await hashPassword(newPassword);

  await db.update(users)
    .set({ password: hashedPassword, updatedAt: new Date() })
    .where(eq(users.id, req.user.id));

  const response = formatResponse(true, null, 'Password changed successfully', 200);
  res.status(200).json(response);
});

/**
 * Forgot Password - Send OTP (Placeholder)
 */
export const forgotPassword = asyncHandler(async (req: CustomRequest, res: Response) => {
  throw new AppError(501, 'Forgot password functionality is currently being refactored');
});

/**
 * Verify OTP (Placeholder)
 */
export const verifyOTP = asyncHandler(async (req: CustomRequest, res: Response) => {
  throw new AppError(501, 'OTP verification is currently being refactored');
});

/**
 * Reset Password (Placeholder)
 */
export const resetPassword = asyncHandler(async (req: CustomRequest, res: Response) => {
  throw new AppError(501, 'Password reset is currently being refactored');
});
