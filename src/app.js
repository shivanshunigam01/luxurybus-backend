import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { apiLimiter, authLimiter, paymentLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { sanitizeBody } from './middleware/sanitize.js';
import { logger } from './utils/logger.js';
import authRoutes from './routes/auth.routes.js';
import leadRoutes from './routes/lead.routes.js';
import customerRoutes from './routes/customer.routes.js';
import vendorRoutes from './routes/vendor.routes.js';
import adminRoutes from './routes/admin.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import publicRoutes from './routes/public.routes.js';
import b2bRoutes from './routes/b2b.routes.js';
import enterpriseRoutes, { vendorEnterpriseRouter, adminEnterpriseExtras } from './routes/enterprise.routes.js';

const app = express();

const allowedOrigins = String(env.CLIENT_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (env.NODE_ENV !== 'production') return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) return callback(null, true);
    return callback(new Error(`CORS blocked for origin ${origin}`));
  },
  credentials: true,
};

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeBody);
app.use(
  morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  }),
);
app.use('/api', apiLimiter);

app.get('/health', (_req, res) =>
  res.json({ ok: true, service: 'luxurybus-backend', env: env.NODE_ENV, ts: new Date().toISOString() }),
);

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/vendor', vendorEnterpriseRouter);
app.use('/api/b2b', b2bRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminEnterpriseExtras);
app.use('/api/enterprise', enterpriseRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/payments', paymentLimiter, paymentRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
export default app;
