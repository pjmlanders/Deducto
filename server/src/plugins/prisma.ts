import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    /** True once DB connection has succeeded; stays false if connection failed. */
    prismaConnected: boolean;
    /** Resolves when DB is connected; rejects if connection failed after all retries. */
    prismaReady: Promise<void>;
  }
}

const HEALTH_PREFIX = '/api/v1/health';

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV !== 'production' ? ['warn', 'error'] : ['error'],
  });

  let resolveReady: () => void;
  let rejectReady: (err: Error) => void;
  const prismaReady = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  fastify.decorate('prisma', prisma);
  fastify.decorate('prismaConnected', false);
  fastify.decorate('prismaReady', prismaReady);

  // Connect in background so server can start listening even if DB is temporarily down
  const maxAttempts = 10;
  const delayMs = 2000;
  (async () => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await prisma.$connect();
        fastify.prismaConnected = true;
        fastify.log.info('Database connected');
        resolveReady!();
        return;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        fastify.log.warn(
          { attempt, maxAttempts, err: message },
          `Database connection attempt ${attempt}/${maxAttempts} failed`
        );
        if (attempt === maxAttempts) {
          fastify.log.error(
            { err },
            'Database connection failed. Set DATABASE_URL and ensure the database is reachable (e.g. ?sslmode=require for Railway Postgres).'
          );
          rejectReady!(err instanceof Error ? err : new Error(String(err)));
          return;
        }
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  })();

  // For non-health API routes, wait for DB (with timeout) or return 503
  fastify.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/api/v1') || request.url.startsWith(HEALTH_PREFIX)) return;

    const timeoutMs = 15_000;
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Database connection timeout')), timeoutMs)
    );

    try {
      await Promise.race([fastify.prismaReady, timeout]);
      if (!fastify.prismaConnected) {
        return reply.status(503).send({
          error: 'Database unavailable',
          code: 'DB_NOT_READY',
        });
      }
    } catch {
      return reply.status(503).send({
        error: 'Database unavailable. Check server logs and DATABASE_URL (e.g. SSL for Railway).',
        code: 'DB_UNAVAILABLE',
      });
    }
  });

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
};

export default fp(prismaPlugin, { name: 'prisma' });
