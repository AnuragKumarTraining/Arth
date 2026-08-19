import pino from 'pino';
import { env } from '../config/env';

let transport;
try {
  require.resolve('pino-pretty');
  if (!env.isProduction) {
    transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
      },
    };
  }
} catch {
}

export const logger = pino({
  level: env.log_level || 'info',
  transport,
});