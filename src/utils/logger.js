import { env } from '../config/env.js';

const ts = () => new Date().toISOString();

const write = (level, message, meta) => {
  const line = {
    ts: ts(),
    level,
    message,
    ...(meta && typeof meta === 'object' ? { meta } : meta != null ? { meta } : {}),
  };
  const out = env.NODE_ENV === 'production' ? JSON.stringify(line) : `[${line.ts}] ${level.toUpperCase()} ${message}${meta ? ` ${JSON.stringify(meta)}` : ''}`;
  if (level === 'error') console.error(out);
  else if (level === 'warn') console.warn(out);
  else console.log(out);
};

export const logger = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
  debug: (message, meta) => {
    if (env.NODE_ENV !== 'production') write('debug', message, meta);
  },
};
