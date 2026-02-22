import { FastifyPluginAsync } from 'fastify';

const tagRoutes: FastifyPluginAsync = async (fastify) => {
  // List tags
  fastify.get('/tags', async (request) => {
    return fastify.prisma.tag.findMany({
      where: { userId: request.userId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { expenses: true } } },
    });
  });

  // Create tag
  fastify.post<{
    Body: { name: string; color?: string };
  }>('/tags', async (request, reply) => {
    const { name, color } = request.body;

    if (!name?.trim()) {
      return reply.status(400).send({ error: 'Tag name is required' });
    }

    const tag = await fastify.prisma.tag.create({
      data: {
        userId: request.userId,
        name: name.trim(),
        color: color || '#6b7280',
      },
    });

    return reply.status(201).send(tag);
  });

  // Update tag
  fastify.put<{
    Params: { id: string };
    Body: { name?: string; color?: string };
  }>('/tags/:id', async (request, reply) => {
    const existing = await fastify.prisma.tag.findFirst({
      where: { id: request.params.id, userId: request.userId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Tag not found' });
    }

    const { name, color } = request.body;

    const tag = await fastify.prisma.tag.update({
      where: { id: request.params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(color !== undefined && { color }),
      },
    });

    return tag;
  });

  // Delete tag
  fastify.delete<{ Params: { id: string } }>('/tags/:id', async (request, reply) => {
    const existing = await fastify.prisma.tag.findFirst({
      where: { id: request.params.id, userId: request.userId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Tag not found' });
    }

    await fastify.prisma.tag.delete({ where: { id: request.params.id } });
    return { success: true };
  });
};

export default tagRoutes;
