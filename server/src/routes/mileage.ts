import { FastifyPluginAsync } from 'fastify';

const IRS_MILEAGE_RATE_2025 = 0.70;

const mileageRoutes: FastifyPluginAsync = async (fastify) => {
  // List mileage entries
  fastify.get('/mileage', async (request, reply) => {
    try {
      const query = request.query as Record<string, string>;
      const page = parseInt(query.page) || 1;
      const limit = parseInt(query.limit) || 50;
      const year = query.year ? parseInt(query.year) : undefined;

      const where: any = { userId: request.userId };

      if (year) {
        where.date = {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31, 23, 59, 59),
        };
      }

      const [data, total] = await Promise.all([
        fastify.prisma.mileageEntry.findMany({
          where,
          include: { project: { select: { id: true, name: true, color: true } } },
          orderBy: { date: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        fastify.prisma.mileageEntry.count({ where }),
      ]);

      return {
        data,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    } catch (err) {
      fastify.log.error(err, 'mileage list failed');
      return reply.status(500).send({ error: 'Failed to load mileage entries' });
    }
  });

  // Get single mileage entry
  fastify.get<{ Params: { id: string } }>('/mileage/:id', async (request, reply) => {
    const entry = await fastify.prisma.mileageEntry.findFirst({
      where: { id: request.params.id, userId: request.userId },
      include: { project: { select: { id: true, name: true, color: true } } },
    });
    if (!entry) return reply.status(404).send({ error: 'Mileage entry not found' });
    return entry;
  });

  // Create mileage entry
  fastify.post<{
    Body: {
      date: string;
      startLocation: string;
      endLocation: string;
      distance: number;
      purpose: string;
      projectId?: string;
      roundTrip?: boolean;
      notes?: string;
    };
  }>('/mileage', async (request, reply) => {
    const { date, startLocation, endLocation, distance, purpose, projectId, roundTrip = false, notes } = request.body;

    if (!date || !startLocation || !endLocation || !distance || !purpose || !projectId) {
      return reply.status(400).send({ error: 'date, startLocation, endLocation, distance, purpose, and projectId are required' });
    }

    const actualDistance = roundTrip ? distance * 2 : distance;
    const rateUsed = IRS_MILEAGE_RATE_2025;
    const deduction = actualDistance * rateUsed;

    const entry = await fastify.prisma.mileageEntry.create({
      data: {
        userId: request.userId,
        projectId,
        date: new Date(date),
        startLocation,
        endLocation,
        distance: actualDistance,
        purpose,
        roundTrip,
        rateUsed,
        deduction,
        notes: notes || null,
      },
      include: { project: { select: { id: true, name: true, color: true } } },
    });

    return reply.status(201).send(entry);
  });

  // Update mileage entry
  fastify.put<{
    Params: { id: string };
    Body: {
      date?: string;
      startLocation?: string;
      endLocation?: string;
      distance?: number;
      purpose?: string;
      projectId?: string;
      roundTrip?: boolean;
      notes?: string;
    };
  }>('/mileage/:id', async (request, reply) => {
    const existing = await fastify.prisma.mileageEntry.findFirst({
      where: { id: request.params.id, userId: request.userId },
    });
    if (!existing) return reply.status(404).send({ error: 'Mileage entry not found' });

    const { date, startLocation, endLocation, distance, purpose, projectId, roundTrip, notes } = request.body;

    // Recalculate distance/deduction if either distance or roundTrip changes
    const newRoundTrip = roundTrip ?? existing.roundTrip;
    const baseDistance = distance ?? Number(existing.distance) / (existing.roundTrip ? 2 : 1);
    const actualDistance = (distance != null || roundTrip != null)
      ? (newRoundTrip ? baseDistance * 2 : baseDistance)
      : undefined;
    const deduction = actualDistance != null
      ? actualDistance * Number(existing.rateUsed)
      : undefined;

    const entry = await fastify.prisma.mileageEntry.update({
      where: { id: existing.id },
      data: {
        ...(date && { date: new Date(date) }),
        ...(startLocation && { startLocation }),
        ...(endLocation && { endLocation }),
        ...(actualDistance != null && { distance: actualDistance }),
        ...(purpose && { purpose }),
        ...(projectId !== undefined && { projectId: projectId || null }),
        ...(roundTrip != null && { roundTrip }),
        ...(deduction != null && { deduction }),
        ...(notes !== undefined && { notes: notes || null }),
      },
      include: { project: { select: { id: true, name: true, color: true } } },
    });

    return entry;
  });

  // Delete mileage entry
  fastify.delete<{ Params: { id: string } }>('/mileage/:id', async (request, reply) => {
    const existing = await fastify.prisma.mileageEntry.findFirst({
      where: { id: request.params.id, userId: request.userId },
    });
    if (!existing) return reply.status(404).send({ error: 'Mileage entry not found' });

    await fastify.prisma.mileageEntry.delete({ where: { id: existing.id } });
    return { success: true };
  });

  // Mileage summary
  fastify.get('/mileage/summary', async (request) => {
    const query = request.query as Record<string, string>;
    const year = parseInt(query.year) || new Date().getFullYear();

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const result = await fastify.prisma.mileageEntry.aggregate({
      where: {
        userId: request.userId,
        date: { gte: startDate, lte: endDate },
      },
      _sum: { distance: true, deduction: true },
      _count: true,
    });

    return {
      year,
      totalMiles: result._sum.distance || 0,
      totalDeduction: result._sum.deduction || 0,
      tripCount: result._count,
      rateUsed: IRS_MILEAGE_RATE_2025,
    };
  });
};

export default mileageRoutes;
