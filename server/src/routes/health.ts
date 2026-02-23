import { FastifyPluginAsync } from 'fastify';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async () => {
    const dbConnected = fastify.prismaConnected;
    return {
      status: dbConnected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: dbConnected ? 'connected' : 'disconnected',
    };
  });
};

export default healthRoutes;
