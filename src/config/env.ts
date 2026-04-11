import dotenv from 'dotenv';

dotenv.config();

const NODE_ENV = process.env.NODE_ENV?.trim() || 'development';
const isProduction = NODE_ENV === 'production';

const getEnvValue = (names: string[]): string | undefined => {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return undefined;
};

const getRequiredEnv = (
  name: string,
  aliases: string[] = [],
  developmentFallback?: string
): string => {
  const value = getEnvValue([name, ...aliases]);

  if (value) {
    return value;
  }

  if (!isProduction && developmentFallback) {
    return developmentFallback;
  }

  const acceptedNames = [name, ...aliases].join(', ');
  throw new Error(`Missing required environment variable: ${acceptedNames}`);
};

const getOptionalEnv = (name: string, aliases: string[] = []): string | undefined => {
  return getEnvValue([name, ...aliases]);
};

const getNumberEnv = (name: string, fallback: number, aliases: string[] = []): number => {
  const value = getEnvValue([name, ...aliases]);

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
  NODE_ENV,

  // Database
  DATABASE_URL: getRequiredEnv('DATABASE_URL'),

  // JWT
  JWT_SECRET: getRequiredEnv('JWT_SECRET'),
  JWT_EXPIRY: process.env.JWT_EXPIRY || '7d',

  // CORS
  CORS_ALLOWED_ORIGINS: getRequiredEnv(
    'CORS_ALLOWED_ORIGINS',
    ['CORS_ORIGIN'],
    'http://localhost:8080,http://localhost:8081'
  )
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean),

  // App Security
  APP_TOKEN: getRequiredEnv('APP_TOKEN', [], 'CMS-V3-SECURE-ACCESS'),

  // SMTP
  SMTP: {
    HOST: getRequiredEnv('SMTP_HOST'),
    PORT: getNumberEnv('SMTP_PORT', 587),
    USER: getOptionalEnv('SMTP_USER', ['EMAIL_USER']),
    PASS: getOptionalEnv('SMTP_PASS', ['EMAIL_PASSWORD']),
    FROM_NAME: getRequiredEnv('SMTP_FROM_NAME', ['EMAIL_FROM_NAME'], 'Course Management'),
    FROM_EMAIL: getRequiredEnv('SMTP_FROM_EMAIL', ['ADMIN_EMAIL', 'EMAIL_USER']),
  },
  // Session secret
  SESSION_SECRET: getRequiredEnv('SESSION_SECRET', ['JWT_SECRET']),

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