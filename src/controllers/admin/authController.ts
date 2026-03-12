import { Response } from 'express';
import { CustomRequest } from '../../types/common';
import { db, users } from '../../models';
import { eq, sql } from 'drizzle-orm';
import {
  generateToken,
  hashPassword,
  comparePassword,
  formatResponse,
} from '../../utils/helpers';
import { AppError, asyncHandler } from '../../middleware/errorHandler';

/**
 * Admin Login
 */
export const adminLogin = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError(400, 'Email and password are required');
  }

  const results = await db.select()
    .from(users)
    .where(eq(sql`LOWER(${users.email})`, email.toLowerCase()))
    .limit(1);

  const user = results[0];

  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  if (user.role !== 'admin' && user.role !== 'super_admin') {
    throw new AppError(403, 'Insufficient permissions');
  }

  if (user.status !== 'ACTIVE') {
    throw new AppError(403, 'Account is inactive');
  }

  const isPasswordMatch = await comparePassword(password, user.password);

  if (!isPasswordMatch) {
    throw new AppError(401, 'Invalid email or password');
  }

  const token = generateToken(user.id, user.role || 'admin');

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
 * Admin Logout (No change needed logically)
 */
export const adminLogout = asyncHandler(async (req: CustomRequest, res: Response) => {
  const response = formatResponse(true, null, 'Logout successful', 200);
  res.status(200).json(response);
});

/**
 * Get Admin Profile
 */
export const getProfile = asyncHandler(async (req: CustomRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'User not authenticated');
  }

  const results = await db.select()
    .from(users)
    .where(eq(users.id, req.user.id as unknown as number))
    .limit(1);

  const user = results[0];

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  // Omit password from response
  const { password, ...userData } = user;

  const response = formatResponse(true, userData, 'Profile retrieved successfully', 200);
  res.status(200).json(response);
});

/**
 * Update Admin Profile
 */
export const updateProfile = asyncHandler(async (req: CustomRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'User not authenticated');
  }

  const { name } = req.body;

  const updateData: any = {};
  if (name) updateData.name = name;
  updateData.updatedAt = new Date();

  const updatedResults = await db.update(users)
    .set(updateData)
    .where(eq(users.id, req.user.id as unknown as number))
    .returning();

  const user = updatedResults[0];

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const { password, ...userData } = user;

  const response = formatResponse(true, userData, 'Profile updated successfully', 200);
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
    .where(eq(users.id, req.user.id as unknown as number))
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
    .where(eq(users.id, req.user.id as unknown as number));

  const response = formatResponse(true, null, 'Password changed successfully', 200);
  res.status(200).json(response);
});
