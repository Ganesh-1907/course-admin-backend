import crypto from 'crypto';
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
import { sendOTPEmail } from '../../utils/emailService';

/**
 * User Register
 */
export const registerUser = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { name, email, mobile, password, confirmPassword, acceptTerms } = req.body;

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

  const existingParticipant = await Participant.findOne({
    email: email.toLowerCase()
  });

  if (existingParticipant) {
    throw new AppError(400, 'Email already registered');
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

/**
 * Forgot Password - Send OTP
 */
export const forgotPassword = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError(400, 'Email is required');
  }

  const participant = await Participant.findOne({ email: email.toLowerCase() });

  if (!participant) {
    throw new AppError(404, 'User with this email does not exist');
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  participant.otp = otp;
  participant.otpExpiry = otpExpiry;
  await participant.save();

  try {
    await sendOTPEmail(participant.email, otp);
    
    const response = formatResponse(true, null, 'OTP sent to your email successfully', 200);
    res.status(200).json(response);
  } catch (error) {
    participant.otp = undefined;
    participant.otpExpiry = undefined;
    await participant.save();
    throw new AppError(500, 'Email could not be sent. Please try again later.');
  }
});

/**
 * Verify OTP
 */
export const verifyOTP = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new AppError(400, 'Email and OTP are required');
  }

  const participant = await Participant.findOne({
    email: email.toLowerCase(),
    otp,
    otpExpiry: { $gt: new Date() },
  });

  if (!participant) {
    throw new AppError(400, 'Invalid or expired OTP');
  }

  // Generate a temporary reset token to ensure the same user resets the password
  const resetToken = crypto.randomBytes(32).toString('hex');
  participant.resetPasswordToken = resetToken;
  participant.resetPasswordExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  
  // Clear OTP
  participant.otp = undefined;
  participant.otpExpiry = undefined;
  await participant.save();

  const response = formatResponse(true, { resetToken }, 'OTP verified successfully', 200);
  res.status(200).json(response);
});

/**
 * Reset Password
 */
export const resetPassword = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { email, resetToken, newPassword, confirmPassword } = req.body;

  if (!email || !resetToken || !newPassword || !confirmPassword) {
    throw new AppError(400, 'All fields are required');
  }

  if (newPassword !== confirmPassword) {
    throw new AppError(400, 'Passwords do not match');
  }

  if (newPassword.length < 6) {
    throw new AppError(400, 'Password must be at least 6 characters');
  }

  const participant = await Participant.findOne({
    email: email.toLowerCase(),
    resetPasswordToken: resetToken,
    resetPasswordExpiry: { $gt: new Date() },
  });

  if (!participant) {
    throw new AppError(400, 'Invalid or expired reset token');
  }

  participant.password = await hashPassword(newPassword);
  participant.resetPasswordToken = undefined;
  participant.resetPasswordExpiry = undefined;
  await participant.save();

  const response = formatResponse(true, null, 'Password reset successful. You can now login.', 200);
  res.status(200).json(response);
});

