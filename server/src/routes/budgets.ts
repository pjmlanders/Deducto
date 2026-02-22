import { FastifyPluginAsync } from 'fastify';

const budgetRoutes: FastifyPluginAsync = async (fastify) => {
  // List all budgets
  fastify.get('/budgets', async (request) => {
    const budgets = await fastify.prisma.budget.findMany({
      where: { userId: request.userId },
      include: {
        project: { select: { id: true, name: true, color: true } },
        category: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return budgets;
  });

  // Budget status — compare actual spending vs budget
  fastify.get('/budgets/status', async (request) => {
    const query = request.query as Record<string, string>;
    const year = parseInt(query.year) || new Date().getFullYear();
    const month = parseInt(query.month) || new Date().getMonth() + 1;

    const budgets = await fastify.prisma.budget.findMany({
      where: { userId: request.userId },
      include: {
        project: { select: { id: true, name: true, color: true } },
        category: { select: { id: true, name: true, color: true } },
      },
    });

    const result = await Promise.all(
      budgets.map(async (budget) => {
        // Determine date range based on period
        let startDate: Date;
        let endDate: Date;

        if (budget.period === 'monthly') {
          startDate = new Date(year, month - 1, 1);
          endDate = new Date(year, month, 0, 23, 59, 59);
        } else if (budget.period === 'quarterly') {
          const quarter = Math.floor((month - 1) / 3);
          startDate = new Date(year, quarter * 3, 1);
          endDate = new Date(year, quarter * 3 + 3, 0, 23, 59, 59);
        } else {
          startDate = new Date(year, 0, 1);
          endDate = new Date(year, 11, 31, 23, 59, 59);
        }

        const where: any = {
          userId: request.userId,
          date: { gte: startDate, lte: endDate },
        };

        if (budget.projectId) where.projectId = budget.projectId;
        if (budget.categoryId) where.categoryId = budget.categoryId;

        const spent = await fastify.prisma.expense.aggregate({
          where,
          _sum: { amount: true },
        });

        const actual = Number(spent._sum.amount || 0);
        const budgetAmount = Number(budget.amount);
        const percentage = budgetAmount > 0 ? (actual / budgetAmount) * 100 : 0;

        return {
          ...budget,
          actual,
          remaining: budgetAmount - actual,
          percentage: Math.round(percentage * 10) / 10,
          status: percentage >= 100 ? 'over' : percentage >= 80 ? 'warning' : 'ok',
        };
      })
    );

    return result;
  });

  // Create budget
  fastify.post<{
    Body: {
      projectId?: string;
      categoryId?: string;
      amount: number;
      period: string;
    };
  }>('/budgets', async (request, reply) => {
    const { projectId, categoryId, amount, period } = request.body;

    if (!amount || !period) {
      return reply.status(400).send({ error: 'amount and period are required' });
    }

    if (!['monthly', 'quarterly', 'yearly'].includes(period)) {
      return reply.status(400).send({ error: 'period must be monthly, quarterly, or yearly' });
    }

    const now = new Date();
    const budget = await fastify.prisma.budget.create({
      data: {
        userId: request.userId,
        projectId: projectId || null,
        categoryId: categoryId || null,
        amount,
        period,
        startDate: new Date(now.getFullYear(), 0, 1),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        category: { select: { id: true, name: true, color: true } },
      },
    });

    return reply.status(201).send(budget);
  });

  // Update budget
  fastify.put<{
    Params: { id: string };
    Body: { amount?: number; period?: string };
  }>('/budgets/:id', async (request, reply) => {
    const existing = await fastify.prisma.budget.findFirst({
      where: { id: request.params.id, userId: request.userId },
    });
    if (!existing) return reply.status(404).send({ error: 'Budget not found' });

    const { amount, period } = request.body;
    const budget = await fastify.prisma.budget.update({
      where: { id: existing.id },
      data: {
        ...(amount != null && { amount }),
        ...(period && { period }),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        category: { select: { id: true, name: true, color: true } },
      },
    });

    return budget;
  });

  // Delete budget
  fastify.delete<{ Params: { id: string } }>('/budgets/:id', async (request, reply) => {
    const existing = await fastify.prisma.budget.findFirst({
      where: { id: request.params.id, userId: request.userId },
    });
    if (!existing) return reply.status(404).send({ error: 'Budget not found' });

    await fastify.prisma.budget.delete({ where: { id: existing.id } });
    return { success: true };
  });
};

export default budgetRoutes;
