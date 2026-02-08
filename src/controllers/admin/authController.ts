import { Response } from 'express';
import { CustomRequest, ApiResponse } from '../../types/common';
import { Admin } from '../../models';
import {
  generateToken,
  hashPassword,
  comparePassword,
  validateEmail,
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

  const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');

  if (!admin) {
    throw new AppError(401, 'Invalid email or password');
  }

  if (!admin.isActive) {
    throw new AppError(403, 'Admin account is inactive');
  }

  const isPasswordMatch = await comparePassword(password, admin.password);

  if (!isPasswordMatch) {
    throw new AppError(401, 'Invalid email or password');
  }

  admin.lastLogin = new Date();
  await admin.save();

  const token = generateToken(admin._id.toString(), admin.role);

  const response = formatResponse(
    true,
    {
      token,
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    },
    'Login successful',
    200
  );

  res.status(200).json(response);
});

/**
 * Admin Logout
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

  const admin = await Admin.findById(req.user.id);

  if (!admin) {
    throw new AppError(404, 'Admin not found');
  }

  const response = formatResponse(true, admin, 'Profile retrieved successfully', 200);
  res.status(200).json(response);
});

/**
 * Update Admin Profile
 */
export const updateProfile = asyncHandler(async (req: CustomRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'User not authenticated');
  }

  const { name, phone, department } = req.body;

  const admin = await Admin.findByIdAndUpdate(
    req.user.id,
    {
      ...(name && { name }),
      ...(phone && { phone }),
      ...(department && { department }),
    },
    { new: true, runValidators: true }
  );

  if (!admin) {
    throw new AppError(404, 'Admin not found');
  }

  const response = formatResponse(true, admin, 'Profile updated successfully', 200);
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

  const admin = await Admin.findById(req.user.id).select('+password');

  if (!admin) {
    throw new AppError(404, 'Admin not found');
  }

  const isPasswordMatch = await comparePassword(currentPassword, admin.password);

  if (!isPasswordMatch) {
    throw new AppError(401, 'Current password is incorrect');
  }

  admin.password = await hashPassword(newPassword);
  await admin.save();

  const response = formatResponse(true, null, 'Password changed successfully', 200);
  res.status(200).json(response);
});
