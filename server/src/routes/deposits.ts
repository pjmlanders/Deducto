import { FastifyPluginAsync } from 'fastify';
import { Prisma } from '@prisma/client';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';
import { validateWithZod } from '../utils/validate.js';
import { createDepositSchema, updateDepositSchema } from '../schemas/deposits.js';

const depositRoutes: FastifyPluginAsync = async (fastify) => {
  // List deposits
  fastify.get('/deposits', async (request) => {
    const query = request.query as Record<string, string>;
    const { page, limit } = parsePagination(query);

    const where: Prisma.DepositWhereInput = { userId: request.userId };
    if (query.projectId) where.projectId = query.projectId;
    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) where.date.gte = new Date(query.dateFrom);
      if (query.dateTo) where.date.lte = new Date(query.dateTo);
    }

    const [deposits, total] = await Promise.all([
      fastify.prisma.deposit.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          project: { select: { id: true, name: true, color: true } },
        },
      }),
      fastify.prisma.deposit.count({ where }),
    ]);

    return paginatedResponse(deposits, total, { page, limit });
  });

  // Get single deposit
  fastify.get<{ Params: { id: string } }>('/deposits/:id', async (request, reply) => {
    const deposit = await fastify.prisma.deposit.findFirst({
      where: { id: request.params.id, userId: request.userId },
      include: { project: true },
    });

    if (!deposit) {
      return reply.status(404).send({ error: 'Deposit not found' });
    }

    return deposit;
  });

  // Create deposit
  fastify.post('/deposits', async (request, reply) => {
    const body = validateWithZod(reply, createDepositSchema, request.body);
    if (body === undefined) return;

    const project = await fastify.prisma.project.findFirst({
      where: { id: body.projectId, userId: request.userId },
    });
    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const deposit = await fastify.prisma.deposit.create({
      data: {
        userId: request.userId,
        projectId: body.projectId,
        source: body.source,
        description: body.description ?? null,
        amount: body.amount,
        currency: body.currency ?? 'USD',
        date: new Date(body.date),
        incomeCategory: body.incomeCategory ?? null,
        notes: body.notes ?? null,
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
      },
    });

    return reply.status(201).send(deposit);
  });

  // Update deposit
  fastify.put<{ Params: { id: string } }>('/deposits/:id', async (request, reply) => {
    const existing = await fastify.prisma.deposit.findFirst({
      where: { id: request.params.id, userId: request.userId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Deposit not found' });
    }

    const body = validateWithZod(reply, updateDepositSchema, request.body);
    if (body === undefined) return;

    const deposit = await fastify.prisma.deposit.update({
      where: { id: request.params.id },
      data: {
        ...(body.source !== undefined && { source: body.source }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.amount !== undefined && { amount: body.amount }),
        ...(body.date !== undefined && { date: new Date(body.date) }),
        ...(body.projectId !== undefined && { projectId: body.projectId }),
        ...(body.incomeCategory !== undefined && { incomeCategory: body.incomeCategory }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.currency !== undefined && { currency: body.currency }),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
      },
    });

    return deposit;
  });

  // Delete deposit
  fastify.delete<{ Params: { id: string } }>('/deposits/:id', async (request, reply) => {
    const existing = await fastify.prisma.deposit.findFirst({
      where: { id: request.params.id, userId: request.userId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Deposit not found' });
    }

    await fastify.prisma.deposit.delete({ where: { id: request.params.id } });
    return { success: true };
  });
};

export default depositRoutes;
