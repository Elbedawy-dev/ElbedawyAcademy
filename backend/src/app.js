import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import xss from 'xss-clean';

import env from './config/env.js';
import logger from './utils/logger.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { generalLimiter } from './middlewares/rateLimit.middleware.js';
import AppError from './utils/AppError.js';
import { serveSwagger, setupSwagger } from './docs/swagger.js';

const app = express();

// Set trust proxy if behind reverse proxy
if (env.TRUST_PROXY) {
  app.set('trust proxy', env.TRUST_PROXY);
}

// Security HTTP headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-paymob-hmac'],
  }),
);

// Compression
app.use(compression());

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent HTTP Parameter Pollution
app.use(hpp());

// HTTP request logging
if (!env.isTest) {
  app.use(
    morgan(env.isProduction ? 'combined' : 'dev', {
      stream: logger.stream,
      skip: (req) => req.url === '/api/v1/health',
    }),
  );
}

// Rate limiting on all API routes
app.use('/api', generalLimiter);

// API Documentation via Swagger
app.use('/api/docs', serveSwagger, setupSwagger);

// API v1 routes
app.use('/api/v1', apiRoutes);

// Root redirect to docs
app.get('/', (_req, res) => {
  res.redirect('/api/docs');
});

// Handle unhandled routes with 404
app.all('*', (req, _res, next) => {
  next(AppError.notFound(`Cannot find ${req.method} ${req.originalUrl} on this server`));
});

// Central Error Handling Middleware
app.use(errorHandler);

export default app;
