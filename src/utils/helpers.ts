import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/env';
import { db } from '../db';
import { courses } from '../db/schema';
import { desc, like } from 'drizzle-orm';

/**
 * Hash password using bcryptjs
 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * Compare plain password with hashed password
 */
export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

/**
 * Generate JWT token
 */
export const generateToken = (userId: number, role: string): string => {
  return jwt.sign(
    { id: userId, role },
    config.JWT_SECRET as string,
    {
      expiresIn: config.JWT_EXPIRY,
    } as any
  );
};

/**
 * Calculate final price after discount
 */
export const calculateFinalPrice = (price: number, discountPercentage: number): number => {
  const discountAmount = (price * discountPercentage) / 100;
  return parseFloat((price - discountAmount).toFixed(2));
};

/**
 * Standard API response formatter
 */
export const formatResponse = <T>(
  success: boolean,
  data: T | null = null,
  message: string = '',
  statusCode: number = 200
): any => {
  return {
    success,
    statusCode,
    message,
    ...(data && { data }),
  };
};

/**
 * Pagination helper
 */
export const paginate = (page: number = 1, limit: number = 10) => {
  page = Math.max(1, page || 1);
  limit = Math.max(1, Math.min(100, limit || 10));

  return {
    skip: (page - 1) * limit,
    limit,
    page,
  };
};

/**
 * Validate email
 */
export const validateEmail = (email: string): boolean => {
  const regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return regex.test(email);
};
