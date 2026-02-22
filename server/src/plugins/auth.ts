import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { createClerkClient, verifyToken } from '@clerk/backend';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
    userEmail: string;
  }
}

/** Routes that skip JWT verification. Add any new public API paths here. */
const PUBLIC_ROUTES = ['/api/v1/health'];

const authPlugin: FastifyPluginAsync = async (fastify) => {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;

  if (!clerkSecretKey) {
    fastify.log.warn('CLERK_SECRET_KEY not set - auth will be disabled');
  }

  const clerk = clerkSecretKey
    ? createClerkClient({ secretKey: clerkSecretKey })
    : null;

  fastify.addHook('onRequest', async (request, reply) => {
    // Skip auth for public routes
    if (PUBLIC_ROUTES.some(route => request.url.startsWith(route))) {
      return;
    }

    // In development without Clerk, use a dev user
    if (!clerk) {
      request.userId = 'dev_user';
      request.userEmail = 'dev@example.com';

      // Upsert dev user
      await fastify.prisma.user.upsert({
        where: { id: 'dev_user' },
        update: {},
        create: { id: 'dev_user', email: 'dev@example.com', name: 'Developer' },
      });
      return;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing authorization token' });
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      const payload = await verifyToken(token, {
        secretKey: clerkSecretKey,
      });

      request.userId = payload.sub;
      request.userEmail = (payload as any).email || '';

      // Upsert user in database
      await fastify.prisma.user.upsert({
        where: { id: payload.sub },
        update: {
          email: request.userEmail,
        },
        create: {
          id: payload.sub,
          email: request.userEmail,
          name: (payload as any).name || null,
        },
      });
    } catch (err) {
      fastify.log.error(err, 'Auth verification failed');
      return reply.status(401).send({ error: 'Invalid token' });
    }
  });
};

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['prisma'],
});
