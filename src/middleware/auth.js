import { verifyAccessToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';
export const requireAuth = (req, _res, next) => {
  const auth = req.headers.authorization || '';
  const [type, token] = auth.split(' ');
  if (type !== 'Bearer' || !token) return next(new ApiError(401, 'Authentication required'));
  try { req.user = verifyAccessToken(token); next(); } catch { next(new ApiError(401, 'Invalid or expired token')); }
};
export const requireRole = (...roles) => (req, _res, next) => !req.user ? next(new ApiError(401, 'Authentication required')) : roles.includes(req.user.role) ? next() : next(new ApiError(403, 'Access denied'));
export const optionalAuth = (req, _res, next) => { const auth = req.headers.authorization || ''; const [type, token] = auth.split(' '); if (type === 'Bearer' && token) { try { req.user = verifyAccessToken(token); } catch { req.user = null; } } next(); };
