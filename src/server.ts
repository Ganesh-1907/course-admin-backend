import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import session from 'express-session';
import './types/session'; // Explicitly load session types
import rateLimit from 'express-rate-limit';
import config from './config/env';
import { connectDB } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';
import { handleRazorpayWebhook, handleStripeWebhook } from './controllers/user/paymentController';
import { verifyToken } from './middleware/auth';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

/**
 * Database Connection
 */
connectDB();

/**
 * Security & Utility Middleware
 */
app.use(helmet());
app.use(morgan('dev'));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter to all routes
app.use('/api/', limiter);

// CORS Configuration
const ALLOWED_ORIGINS = config.CORS_ALLOWED_ORIGINS || [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      if (ALLOWED_ORIGINS.includes("*") || (Array.isArray(ALLOWED_ORIGINS) && ALLOWED_ORIGINS.includes(origin))) {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CMS-App-Token'],
  })
);

/**
 * Session Middleware
 */
app.use(
  session({
    name: 'viovn.sid',
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: config.NODE_ENV === 'production',
    cookie: {
      secure: config.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax'
    },
  })
);

/**
 * Payment Webhooks
 * These routes must receive the raw request body and cannot require the app token header.
 */
app.post('/api/user/payments/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);
app.post('/api/user/payments/razorpay/webhook', express.raw({ type: 'application/json' }), handleRazorpayWebhook);

/**
 * Custom Security Header Middleware
 * Blocks unauthorized requests
 */
const securityHeaderMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Allow preflight OPTIONS requests to pass through
  if (req.method === 'OPTIONS') {
    return next();
  }

  const appToken = req.headers['x-cms-app-token'];
  
  if (appToken !== config.APP_TOKEN) {
    console.error(`[Security] Token Mismatch! Access denied for ${req.method} ${req.originalUrl}`);
    return res.status(403).json({
      success: false,
      message: 'Access denied: Invalid application token',
    });
  }
  next();
};

// Apply security header middleware to all /api routes
app.use('/api', securityHeaderMiddleware);

/**
 * Body Parser Middleware
 */
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ limit: '10mb', extended: true }));


/**
 * Static Files
 * Added auth to protect sensitive files like resumes and brochures
 */
app.use('/uploads', verifyToken, express.static(path.join(__dirname, '../uploads')));

/**
 * API Routes
 */
app.use('/api', routes);

/**
 * 404 Handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    statusCode: 404,
  });
});

/**
 * Global Error Handler Middleware
 */
app.use(errorHandler);

/**
 * Server Startup
 */
const PORT = config.PORT;

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║   Course Management API Server       ║
║   Running on port ${PORT}             ║
║   Environment: ${config.NODE_ENV}          ║
╚══════════════════════════════════════╝
  `);
});

export default app;
