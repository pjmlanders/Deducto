import { FastifyPluginAsync } from 'fastify';

const savedLocationRoutes: FastifyPluginAsync = async (fastify) => {
  // List saved locations
  fastify.get('/saved-locations', async (request, reply) => {
    try {
      return await fastify.prisma.savedLocation.findMany({
        where: { userId: request.userId },
        orderBy: { name: 'asc' },
      });
    } catch (err) {
      fastify.log.error(err, 'saved-locations list failed');
      return reply.status(500).send({ error: 'Failed to load saved locations' });
    }
  });

  // Create saved location
  fastify.post<{ Body: { name: string; address: string } }>(
    '/saved-locations',
    async (request, reply) => {
      try {
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
      } catch (err) {
        fastify.log.error(err, 'saved-locations create failed');
        return reply.status(500).send({ error: 'Failed to create saved location' });
      }
    }
  );

  // Delete saved location
  fastify.delete<{ Params: { id: string } }>('/saved-locations/:id', async (request, reply) => {
    try {
      const existing = await fastify.prisma.savedLocation.findFirst({
        where: { id: request.params.id, userId: request.userId },
      });
      if (!existing) return reply.status(404).send({ error: 'Location not found' });

      await fastify.prisma.savedLocation.delete({ where: { id: existing.id } });
      return { success: true };
    } catch (err) {
      fastify.log.error(err, 'saved-locations delete failed');
      return reply.status(500).send({ error: 'Failed to delete saved location' });
    }
  });
};

export default savedLocationRoutes;
