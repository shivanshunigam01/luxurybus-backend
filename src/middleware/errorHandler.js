export const notFoundHandler = (req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
export const errorHandler = (err, _req, res, _next) => {
  res.status(err.statusCode || 500).json({ error: err.message || 'Internal server error', ...(err.details ? { details: err.details } : {}) });
};
