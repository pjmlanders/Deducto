import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV !== 'production' ? ['warn', 'error'] : ['error'],
  });

  const maxAttempts = 10;
  const delayMs = 2000;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await prisma.$connect();
      fastify.log.info('Database connected');
      break;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      fastify.log.warn({ attempt, maxAttempts }, `Database connection attempt ${attempt}/${maxAttempts} failed: ${message}`);
      if (attempt === maxAttempts) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
};

export default fp(prismaPlugin, { name: 'prisma' });
