import { FastifyPluginAsync } from 'fastify';

const categoryRoutes: FastifyPluginAsync = async (fastify) => {
  // List user categories
  fastify.get('/categories', async (request) => {
    const categories = await fastify.prisma.category.findMany({
      where: { userId: request.userId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        children: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { expenses: true } },
      },
    });

    // Return only top-level categories (children are included via relation)
    return categories.filter((c) => !c.parentId);
  });

  // Create category
  fastify.post<{
    Body: { name: string; icon?: string; color?: string; parentId?: string };
  }>('/categories', async (request, reply) => {
    const { name, icon, color, parentId } = request.body;

    if (!name?.trim()) {
      return reply.status(400).send({ error: 'Category name is required' });
    }

    const category = await fastify.prisma.category.create({
      data: {
        userId: request.userId,
        name: name.trim(),
        icon: icon || null,
        color: color || '#6b7280',
        parentId: parentId || null,
      },
    });

    return reply.status(201).send(category);
  });

  // Update category
  fastify.put<{
    Params: { id: string };
    Body: { name?: string; icon?: string; color?: string; sortOrder?: number };
  }>('/categories/:id', async (request, reply) => {
    const existing = await fastify.prisma.category.findFirst({
      where: { id: request.params.id, userId: request.userId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Category not found' });
    }

    const { name, icon, color, sortOrder } = request.body;

    const category = await fastify.prisma.category.update({
      where: { id: request.params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return category;
  });

  // Delete category
  fastify.delete<{ Params: { id: string } }>('/categories/:id', async (request, reply) => {
    const existing = await fastify.prisma.category.findFirst({
      where: { id: request.params.id, userId: request.userId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Category not found' });
    }

    // Remove category from expenses first (set to null)
    await fastify.prisma.expense.updateMany({
      where: { categoryId: request.params.id },
      data: { categoryId: null },
    });

    await fastify.prisma.category.delete({ where: { id: request.params.id } });
    return { success: true };
  });

  // List IRS tax categories
  fastify.get('/categories/tax', async () => {
    const taxCategories = await fastify.prisma.taxCategory.findMany({
      orderBy: [{ schedule: 'asc' }, { name: 'asc' }],
    });

    return taxCategories;
  });
};

export default categoryRoutes;
