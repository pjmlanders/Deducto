import { FastifyPluginAsync } from 'fastify';

const statsRoutes: FastifyPluginAsync = async (fastify) => {
  /** GET /api/v1/stats — aggregate counts scoped to the authenticated user. */
  fastify.get('/stats', async (request) => {
    const [projectCount, expenseCount] = await Promise.all([
      fastify.prisma.project.count({ where: { userId: request.userId } }),
      fastify.prisma.expense.count({ where: { userId: request.userId } }),
    ]);

    return {
      projects: projectCount,
      expenses: expenseCount,
    };
  });
};

export default statsRoutes;
