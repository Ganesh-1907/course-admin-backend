import { Response } from 'express';
import { CustomRequest } from '../../types/common';
import { Participant } from '../../models';
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
  const { name, email, mobile, password, confirmPassword, acceptTerms } = req.body;

  if (!name || !email || !mobile || !password || !confirmPassword) {
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

  const existingParticipant = await Participant.findOne({
    $or: [{ email: email.toLowerCase() }, { mobile }],
  });

  if (existingParticipant) {
    throw new AppError(400, 'Email or mobile already registered');
  }

  const hashedPassword = await hashPassword(password);

  const participant = new Participant({
    name,
    email: email.toLowerCase(),
    mobile,
    password: hashedPassword,
    status: 'ACTIVE',
    emailVerified: false,
  });

  await participant.save();

  const token = generateToken(participant._id.toString(), 'user');

  const response = formatResponse(
    true,
    {
      token,
      participant: {
        _id: participant._id,
        name: participant.name,
        email: participant.email,
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

  const participant = await Participant.findOne({
    email: email.toLowerCase(),
  }).select('+password');

  if (!participant) {
    throw new AppError(401, 'Invalid email or password');
  }

  if (!participant.password) {
    throw new AppError(401, 'Password not set for this account');
  }

  if (participant.status === 'SUSPENDED') {
    throw new AppError(403, 'Account is suspended');
  }

  const isPasswordMatch = await comparePassword(password, participant.password);

  if (!isPasswordMatch) {
    throw new AppError(401, 'Invalid email or password');
  }

  const token = generateToken(participant._id.toString(), 'user');

  const response = formatResponse(
    true,
    {
      token,
      participant: {
        _id: participant._id,
        name: participant.name,
        email: participant.email,
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

  const participant = await Participant.findById(req.user.id).populate({
    path: 'registeredCourses.courseId',
    select: 'courseName courseId serviceType',
  });

  if (!participant) {
    throw new AppError(404, 'Participant not found');
  }

  const response = formatResponse(true, participant, 'Profile retrieved successfully', 200);
  res.status(200).json(response);
});

/**
 * Update User Profile
 */
export const updateUserProfile = asyncHandler(async (req: CustomRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'User not authenticated');
  }

  const { name, mobile, organization, designation, yearsOfExperience, address } = req.body;

  const participant = await Participant.findByIdAndUpdate(
    req.user.id,
    {
      ...(name && { name }),
      ...(mobile && { mobile }),
      ...(organization && { organization }),
      ...(designation && { designation }),
      ...(yearsOfExperience !== undefined && { yearsOfExperience }),
      ...(address && { address }),
    },
    { new: true, runValidators: true }
  );

  if (!participant) {
    throw new AppError(404, 'Participant not found');
  }

  const response = formatResponse(true, participant, 'Profile updated successfully', 200);
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

  const participant = await Participant.findById(req.user.id).select('+password');

  if (!participant) {
    throw new AppError(404, 'Participant not found');
  }

  if (!participant.password) {
    throw new AppError(400, 'Password not set for this account');
  }

  const isPasswordMatch = await comparePassword(currentPassword, participant.password);

  if (!isPasswordMatch) {
    throw new AppError(401, 'Current password is incorrect');
  }

  participant.password = await hashPassword(newPassword);
  await participant.save();

  const response = formatResponse(true, null, 'Password changed successfully', 200);
  res.status(200).json(response);
});
