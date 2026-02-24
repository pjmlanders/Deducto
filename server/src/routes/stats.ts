import { FastifyPluginAsync } from 'fastify';

const statsRoutes: FastifyPluginAsync = async (fastify) => {
  /** GET /api/v1/stats — aggregate counts (user count, etc.). Requires auth. */
  fastify.get('/stats', async () => {
    const [userCount, projectCount, expenseCount] = await Promise.all([
      fastify.prisma.user.count(),
      fastify.prisma.project.count(),
      fastify.prisma.expense.count(),
    ]);

    return {
      users: userCount,
      projects: projectCount,
      expenses: expenseCount,
    };
  });
};

export default statsRoutes;
