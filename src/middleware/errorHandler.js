import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export const notFoundHandler = (req, res) =>
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });

export const errorHandler = (err, req, res, _next) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
  }
  if (err?.name === 'MulterError') {
    return res.status(400).json({ error: err.message || 'File upload failed' });
  }
  if (err?.message === 'Only images (JPG, PNG, WEBP) and PDF files are allowed') {
    return res.status(400).json({ error: err.message });
  }
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
