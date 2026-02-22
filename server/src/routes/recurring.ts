import { FastifyPluginAsync } from 'fastify';
import { validateWithZod } from '../utils/validate.js';
import { createRecurringRuleSchema, updateRecurringRuleSchema } from '../schemas/recurring.js';

/**
 * Recurring rules API. Cron job to generate expenses from rules is not yet implemented (Phase 6).
 */
const recurringRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/recurring-rules', async (request) => {
    const rules = await fastify.prisma.recurringRule.findMany({
      where: { userId: request.userId },
      orderBy: { createdAt: 'desc' },
    });
    return rules;
  });

  fastify.get<{ Params: { id: string } }>('/recurring-rules/:id', async (request, reply) => {
    const rule = await fastify.prisma.recurringRule.findFirst({
      where: { id: request.params.id, userId: request.userId },
    });
    if (!rule) {
      return reply.status(404).send({ error: 'Recurring rule not found' });
    }
    return rule;
  });

  fastify.post('/recurring-rules', async (request, reply) => {
    const body = validateWithZod(reply, createRecurringRuleSchema, request.body);
    if (body === undefined) return;

    const rule = await fastify.prisma.recurringRule.create({
      data: {
        userId: request.userId,
        frequency: body.frequency,
        interval: body.interval ?? 1,
        dayOfMonth: body.dayOfMonth ?? null,
        dayOfWeek: body.dayOfWeek ?? null,
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        isActive: body.isActive ?? true,
      },
    });
    return reply.status(201).send(rule);
  });

  fastify.put<{ Params: { id: string } }>('/recurring-rules/:id', async (request, reply) => {
    const existing = await fastify.prisma.recurringRule.findFirst({
      where: { id: request.params.id, userId: request.userId },
    });
    if (!existing) {
      return reply.status(404).send({ error: 'Recurring rule not found' });
    }

    const body = validateWithZod(reply, updateRecurringRuleSchema, request.body);
    if (body === undefined) return;

    const rule = await fastify.prisma.recurringRule.update({
      where: { id: request.params.id },
      data: {
        ...(body.frequency !== undefined && { frequency: body.frequency }),
        ...(body.interval !== undefined && { interval: body.interval }),
        ...(body.dayOfMonth !== undefined && { dayOfMonth: body.dayOfMonth }),
        ...(body.dayOfWeek !== undefined && { dayOfWeek: body.dayOfWeek }),
        ...(body.startDate !== undefined && { startDate: new Date(body.startDate) }),
        ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });
    return rule;
  });

  fastify.delete<{ Params: { id: string } }>('/recurring-rules/:id', async (request, reply) => {
    const existing = await fastify.prisma.recurringRule.findFirst({
      where: { id: request.params.id, userId: request.userId },
    });
    if (!existing) {
      return reply.status(404).send({ error: 'Recurring rule not found' });
    }
    await fastify.prisma.recurringRule.delete({ where: { id: request.params.id } });
    return { success: true };
  });
};

export default recurringRoutes;
