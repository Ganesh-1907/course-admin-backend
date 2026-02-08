import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
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
 * Security Middleware
 */
app.use(helmet()); // Set security HTTP headers

/**
 * CORS Configuration
 */
app.use(
  cors({
    origin: config.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

/**
 * Body Parser Middleware
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

/**
 * Logging Middleware
 */
app.use(morgan('combined'));

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
