import dotenv from 'dotenv';

dotenv.config();

const getRequiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const getOptionalEnv = (name: string): string | undefined => {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
};

const getNumberEnv = (name: string, fallback: number): number => {
  const value = process.env[name]?.trim();
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a valid number`);
  }

  return parsed;
};

const normalizeOrigin = (origin: string) => origin.trim().replace(/\/+$/, '');

export const config = {
  // Server
  PORT: getNumberEnv('PORT', 5007),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database
  DATABASE_URL: getRequiredEnv('DATABASE_URL'),

  // JWT
  JWT_SECRET: getRequiredEnv('JWT_SECRET'),
  JWT_EXPIRY: process.env.JWT_EXPIRY || '7d',

  // CORS
  CORS_ALLOWED_ORIGINS: getRequiredEnv('CORS_ALLOWED_ORIGINS')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean),

  // App Security
  APP_TOKEN: getRequiredEnv('APP_TOKEN'),

  // SMTP
  SMTP: {
    HOST: getRequiredEnv('SMTP_HOST'),
    PORT: getNumberEnv('SMTP_PORT', 587),
    USER: getOptionalEnv('SMTP_USER'),
    PASS: getOptionalEnv('SMTP_PASS'),
    FROM_NAME: getRequiredEnv('SMTP_FROM_NAME'),
    FROM_EMAIL: getRequiredEnv('SMTP_FROM_EMAIL'),
  },
  // Session secret
  SESSION_SECRET: getRequiredEnv('SESSION_SECRET'),

  // Razorpay
  RAZORPAY: {
    KEY_ID: getRequiredEnv('RAZORPAY_KEY_ID'),
    KEY_SECRET: getRequiredEnv('RAZORPAY_KEY_SECRET'),
  },
  STRIPE: {
    PUBLISHABLE_KEY: getRequiredEnv('STRIPE_PUBLISHABLE_KEY'),
    SECRET_KEY: getRequiredEnv('STRIPE_SECRET_KEY'),
  },
};


export default config;
