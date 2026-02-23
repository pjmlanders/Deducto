import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import prismaPlugin from './plugins/prisma.js';
import authPlugin from './plugins/auth.js';
import healthRoutes from './routes/health.js';
import projectRoutes from './routes/projects.js';
import expenseRoutes from './routes/expenses.js';
import categoryRoutes from './routes/categories.js';
import depositRoutes from './routes/deposits.js';
import receiptRoutes from './routes/receipts.js';
import reportRoutes from './routes/reports.js';
import tagRoutes from './routes/tags.js';
import mileageRoutes from './routes/mileage.js';
import budgetRoutes from './routes/budgets.js';
import recurringRoutes from './routes/recurring.js';
import savedLocationRoutes from './routes/savedLocations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
        : undefined,
    },
  });

  // Security headers (web app best practices)
  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Permissions-Policy', 'camera=(self), microphone=(self)');
    return payload;
  });

  // CORS
  await app.register(cors, {
    origin: process.env.NODE_ENV === 'production'
      ? process.env.CLIENT_URL || true
      : true,
    credentials: true,
  });

  // Rate limiting: 100 requests per minute per IP (applies to all /api/v1 except health)
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    allowList: process.env.NODE_ENV === 'test' ? ['127.0.0.1'] : undefined,
  });

  // Multipart file uploads (10MB max)
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });

  // Serve uploaded files
  const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'));
  await app.register(fastifyStatic, {
    root: uploadDir,
    prefix: '/uploads/',
    decorateReply: false,
  });

  // Plugins
  await app.register(prismaPlugin);
  await app.register(authPlugin);

  // Routes
  await app.register(healthRoutes, { prefix: '/api/v1' });
  await app.register(projectRoutes, { prefix: '/api/v1' });
  await app.register(expenseRoutes, { prefix: '/api/v1' });
  await app.register(categoryRoutes, { prefix: '/api/v1' });
  await app.register(depositRoutes, { prefix: '/api/v1' });
  await app.register(receiptRoutes, { prefix: '/api/v1' });
  await app.register(reportRoutes, { prefix: '/api/v1' });
  await app.register(tagRoutes, { prefix: '/api/v1' });
  await app.register(mileageRoutes, { prefix: '/api/v1' });
  await app.register(budgetRoutes, { prefix: '/api/v1' });
  await app.register(recurringRoutes, { prefix: '/api/v1' });
  await app.register(savedLocationRoutes, { prefix: '/api/v1' });

  return app;
}
