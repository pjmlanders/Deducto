import { FastifyPluginAsync } from 'fastify';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';

const projectRoutes: FastifyPluginAsync = async (fastify) => {
  // List projects
  fastify.get('/projects', async (request) => {
    const { page, limit } = parsePagination(request.query as Record<string, unknown>);
    const where = { userId: request.userId, isArchived: false };

    const [projects, total] = await Promise.all([
      fastify.prisma.project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { expenses: true, deposits: true } },
        },
      }),
      fastify.prisma.project.count({ where }),
    ]);

    return paginatedResponse(projects, total, { page, limit });
  });

  // Get project by ID with summary stats
  fastify.get<{ Params: { id: string } }>('/projects/:id', async (request, reply) => {
    const project = await fastify.prisma.project.findFirst({
      where: { id: request.params.id, userId: request.userId },
      include: {
        _count: { select: { expenses: true, deposits: true } },
      },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    // Get summary stats
    const [expenseTotal, depositTotal] = await Promise.all([
      fastify.prisma.expense.aggregate({
        where: { projectId: project.id, userId: request.userId },
        _sum: { amount: true },
        _count: true,
      }),
      fastify.prisma.deposit.aggregate({
        where: { projectId: project.id, userId: request.userId },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      ...project,
      summary: {
        totalExpenses: expenseTotal._sum.amount || 0,
        expenseCount: expenseTotal._count,
        totalDeposits: depositTotal._sum.amount || 0,
        depositCount: depositTotal._count,
        netBalance: Number(depositTotal._sum.amount || 0) - Number(expenseTotal._sum.amount || 0),
      },
    };
  });

  // Create project
  fastify.post<{
    Body: { name: string; description?: string; color?: string };
  }>('/projects', async (request, reply) => {
    const { name, description, color } = request.body;

    if (!name?.trim()) {
      return reply.status(400).send({ error: 'Project name is required' });
    }

    const project = await fastify.prisma.project.create({
      data: {
        userId: request.userId,
        name: name.trim(),
        description: description?.trim(),
        color: color || '#3b82f6',
      },
    });

    return reply.status(201).send(project);
  });

  // Update project
  fastify.put<{
    Params: { id: string };
    Body: { name?: string; description?: string; color?: string; isActive?: boolean };
  }>('/projects/:id', async (request, reply) => {
    const existing = await fastify.prisma.project.findFirst({
      where: { id: request.params.id, userId: request.userId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const { name, description, color, isActive } = request.body;

    const project = await fastify.prisma.project.update({
      where: { id: request.params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() }),
        ...(color !== undefined && { color }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return project;
  });

  // Delete (archive) project
  fastify.delete<{ Params: { id: string } }>('/projects/:id', async (request, reply) => {
    const existing = await fastify.prisma.project.findFirst({
      where: { id: request.params.id, userId: request.userId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    await fastify.prisma.project.update({
      where: { id: request.params.id },
      data: { isArchived: true, isActive: false },
    });

    return { success: true };
  });

  // Project summary
  fastify.get<{ Params: { id: string } }>('/projects/:id/summary', async (request, reply) => {
    const project = await fastify.prisma.project.findFirst({
      where: { id: request.params.id, userId: request.userId },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [monthlyExpenses, yearlyExpenses, categoryBreakdown] = await Promise.all([
      fastify.prisma.expense.aggregate({
        where: {
          projectId: project.id,
          userId: request.userId,
          date: { gte: startOfMonth },
        },
        _sum: { amount: true },
        _count: true,
      }),
      fastify.prisma.expense.aggregate({
        where: {
          projectId: project.id,
          userId: request.userId,
          date: { gte: startOfYear },
        },
        _sum: { amount: true },
        _count: true,
      }),
      fastify.prisma.expense.groupBy({
        by: ['categoryId'],
        where: {
          projectId: project.id,
          userId: request.userId,
          date: { gte: startOfYear },
        },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
      }),
    ]);

    return {
      projectId: project.id,
      monthly: {
        total: monthlyExpenses._sum.amount || 0,
        count: monthlyExpenses._count,
      },
      yearly: {
        total: yearlyExpenses._sum.amount || 0,
        count: yearlyExpenses._count,
      },
      categoryBreakdown,
    };
  });
};

export default projectRoutes;
