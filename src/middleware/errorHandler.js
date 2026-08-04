import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export const notFoundHandler = (req, res) =>
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });

export const errorHandler = (err, req, res, _next) => {
  const status = err.statusCode || err.status || 500;
  if (status >= 500) {
    logger.error('request_error', {
      path: req.originalUrl,
      method: req.method,
      message: err.message,
      stack: env.NODE_ENV === 'production' ? undefined : err.stack,
    });
  } else {
    logger.warn('request_rejected', { path: req.originalUrl, method: req.method, message: err.message, status });
  }
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(err.details ? { details: err.details } : {}),
  });
};
