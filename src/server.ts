import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import rateLimit from 'express-rate-limit';
import config from './config/env';
import { connectDB } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';

const app = express();

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

/**
 * Custom Security Header Middleware
 * Blocks requests from tools like Postman/curl that don't send this header
 */
const securityHeaderMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const appToken = req.headers['x-cms-app-token'];
  if (appToken !== 'CMS-V3-SECURE-ACCESS') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Invalid application token',
    });
  }
  next();
};

app.use('/api', securityHeaderMiddleware);

const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:8082',
  config.CORS_ORIGIN
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Reject any request without an origin (Postman/curl)
      if (!origin) return callback(new Error('Origin header required'));

      if (ALLOWED_ORIGINS.includes(origin)) {
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
 * Body Parser Middleware
 */
app.use(express.json({ limit: '10mb' })); // Reduced limit for better security
app.use(express.urlencoded({ limit: '10mb', extended: true }));

/**
 * Static Files
 */
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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
const PORT = config.PORT || 5000;

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
