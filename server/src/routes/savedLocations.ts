import { FastifyPluginAsync } from 'fastify';

const savedLocationRoutes: FastifyPluginAsync = async (fastify) => {
  // List saved locations
  fastify.get('/saved-locations', async (request) => {
    return fastify.prisma.savedLocation.findMany({
      where: { userId: request.userId },
      orderBy: { name: 'asc' },
    });
  });

  // Create saved location
  fastify.post<{ Body: { name: string; address: string } }>(
    '/saved-locations',
    async (request, reply) => {
      const { name, address } = request.body;
      if (!name?.trim() || !address?.trim()) {
        return reply.status(400).send({ error: 'name and address are required' });
      }

      const location = await fastify.prisma.savedLocation.create({
        data: {
          userId: request.userId,
          name: name.trim(),
          address: address.trim(),
        },
      });

      return reply.status(201).send(location);
    }
  );

  // Delete saved location
  fastify.delete<{ Params: { id: string } }>('/saved-locations/:id', async (request, reply) => {
    const existing = await fastify.prisma.savedLocation.findFirst({
      where: { id: request.params.id, userId: request.userId },
    });
    if (!existing) return reply.status(404).send({ error: 'Location not found' });

    await fastify.prisma.savedLocation.delete({ where: { id: existing.id } });
    return { success: true };
  });
};

export default savedLocationRoutes;
