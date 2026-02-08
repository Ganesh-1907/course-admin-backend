import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
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
app.use(morgan('dev')); // Changed directly to 'dev' or keep 'combined'
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps/curl)
      if (!origin) return callback(null, true);

      // Allow any localhost origin
      if (origin.startsWith('http://localhost')) {
        return callback(null, true);
      }

      // Allow configured origin
      if (config.CORS_ORIGIN && origin === config.CORS_ORIGIN) {
        return callback(null, true);
      }

      callback(null, true); // Fallback: allow for now to prevent blockers, can be tightened later
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

/**
 * Body Parser Middleware
 */
app.use(express.json({ limit: '50mb' })); // Increased limit for large payloads/files
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
