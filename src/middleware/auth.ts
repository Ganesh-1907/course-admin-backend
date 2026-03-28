import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/env';
import { CustomRequest } from '../types/common';
import { db, users } from '../models';
import { eq } from 'drizzle-orm';
import { AppError } from './errorHandler';

export const verifyToken = (req: CustomRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'No authorization token provided');
    }

    const token = authHeader.substring(7);
    const decoded: any = jwt.verify(token, config.JWT_SECRET);

    req.user = {
      id: parseInt(decoded.id, 10),
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(401, 'Invalid or expired token');
  }
};

export const verifyAdmin = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'No user found in request');
    }

    const results = await db.select()
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    const user = results[0];

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError(403, 'Account is inactive');
    }

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new AppError(403, 'Insufficient permissions');
    }

    next();
  } catch (error) {
    next(error);
  }
};
