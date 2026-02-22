import { FastifyPluginAsync } from 'fastify';
import { Prisma } from '@prisma/client';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';
import { validateWithZod } from '../utils/validate.js';
import {
  createExpenseSchema,
  updateExpenseSchema,
  bulkDeleteExpensesSchema,
  bulkCategorizeExpensesSchema,
  reimburseExpenseSchema,
} from '../schemas/expenses.js';

const expenseRoutes: FastifyPluginAsync = async (fastify) => {
  // List expenses with filtering, search, and pagination
  fastify.get('/expenses', async (request) => {
    const query = request.query as Record<string, string>;
    const { page, limit } = parsePagination(query);

    const where: Prisma.ExpenseWhereInput = {
      userId: request.userId,
    };

    // Filters
    if (query.projectId) where.projectId = query.projectId;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) where.date.gte = new Date(query.dateFrom);
      if (query.dateTo) where.date.lte = new Date(query.dateTo);
    }
    if (query.vendor) where.vendor = { contains: query.vendor, mode: 'insensitive' };
    if (query.minAmount || query.maxAmount) {
      where.amount = {};
      if (query.minAmount) where.amount.gte = parseFloat(query.minAmount);
      if (query.maxAmount) where.amount.lte = parseFloat(query.maxAmount);
    }
    if (query.reimbursementStatus) where.reimbursementStatus = query.reimbursementStatus;
    if (query.isDeductible) where.isDeductible = query.isDeductible === 'true';
    if (query.isReimbursable) where.isReimbursable = query.isReimbursable === 'true';
    if (query.source) where.source = query.source;

    // Full-text search across vendor, description, notes
    if (query.search) {
      where.OR = [
        { vendor: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Tag filter
    if (query.tagIds) {
      const tagIds = query.tagIds.split(',');
      where.tags = { some: { tagId: { in: tagIds } } };
    }

    // Sort
    const sortField = query.sort || 'date';
    const sortOrder = query.order === 'asc' ? 'asc' : 'desc';
    const orderBy: Prisma.ExpenseOrderByWithRelationInput = { [sortField]: sortOrder };

    const [expenses, total] = await Promise.all([
      fastify.prisma.expense.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          project: { select: { id: true, name: true, color: true } },
          category: { select: { id: true, name: true, icon: true, color: true } },
          taxCategory: { select: { id: true, name: true, schedule: true } },
          receipt: { select: { id: true, thumbnailPath: true, processingStatus: true } },
          tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
        },
      }),
      fastify.prisma.expense.count({ where }),
    ]);

    return paginatedResponse(expenses, total, { page, limit });
  });

  // Get single expense
  fastify.get<{ Params: { id: string } }>('/expenses/:id', async (request, reply) => {
    const expense = await fastify.prisma.expense.findFirst({
      where: { id: request.params.id, userId: request.userId },
      include: {
        project: true,
        category: true,
        taxCategory: true,
        receipt: true,
        tags: { include: { tag: true } },
        recurringRule: true,
      },
    });

    if (!expense) {
      return reply.status(404).send({ error: 'Expense not found' });
    }

    return expense;
  });

  // Create expense
  fastify.post('/expenses', async (request, reply) => {
    const body = validateWithZod(reply, createExpenseSchema, request.body);
    if (body === undefined) return;

    const project = await fastify.prisma.project.findFirst({
      where: { id: body.projectId, userId: request.userId },
    });
    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const expense = await fastify.prisma.expense.create({
      data: {
        userId: request.userId,
        projectId: body.projectId,
        vendor: body.vendor,
        description: body.description,
        amount: body.amount,
        currency: body.currency ?? 'USD',
        date: new Date(body.date),
        categoryId: body.categoryId ?? null,
        taxCategoryId: body.taxCategoryId ?? null,
        receiptId: body.receiptId ?? null,
        isReimbursable: body.isReimbursable ?? false,
        paymentMethod: body.paymentMethod ?? null,
        purchaser: body.purchaser ?? null,
        notes: body.notes ?? null,
        isDeductible: body.isDeductible ?? false,
        isCapitalExpense: body.isCapitalExpense ?? false,
        source: body.receiptId ? 'receipt_scan' : 'manual',
        tags: body.tagIds
          ? { create: body.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        category: { select: { id: true, name: true, icon: true, color: true } },
        tags: { include: { tag: true } },
      },
    });

    return reply.status(201).send(expense);
  });

  // Update expense
  fastify.put<{ Params: { id: string } }>('/expenses/:id', async (request, reply) => {
    const existing = await fastify.prisma.expense.findFirst({
      where: { id: request.params.id, userId: request.userId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Expense not found' });
    }

    const body = validateWithZod(reply, updateExpenseSchema, request.body);
    if (body === undefined) return;

    if (body.tagIds !== undefined) {
      await fastify.prisma.expenseTag.deleteMany({
        where: { expenseId: request.params.id },
      });
    }

    const expense = await fastify.prisma.expense.update({
      where: { id: request.params.id },
      data: {
        ...(body.vendor !== undefined && { vendor: body.vendor }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.amount !== undefined && { amount: body.amount }),
        ...(body.date !== undefined && { date: new Date(body.date) }),
        ...(body.projectId !== undefined && { projectId: body.projectId }),
        ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
        ...(body.taxCategoryId !== undefined && { taxCategoryId: body.taxCategoryId }),
        ...(body.isReimbursable !== undefined && { isReimbursable: body.isReimbursable }),
        ...(body.reimbursementStatus !== undefined && { reimbursementStatus: body.reimbursementStatus }),
        ...(body.reimbursedAmount !== undefined && { reimbursedAmount: body.reimbursedAmount }),
        ...(body.reimbursedDate != null && body.reimbursedDate !== '' && { reimbursedDate: new Date(body.reimbursedDate) }),
        ...(body.paymentMethod !== undefined && { paymentMethod: body.paymentMethod }),
        ...(body.purchaser !== undefined && { purchaser: body.purchaser }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.isDeductible !== undefined && { isDeductible: body.isDeductible }),
        ...(body.isCapitalExpense !== undefined && { isCapitalExpense: body.isCapitalExpense }),
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.tagIds !== undefined && {
          tags: { create: body.tagIds.map((tagId) => ({ tagId })) },
        }),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        category: { select: { id: true, name: true, icon: true, color: true } },
        tags: { include: { tag: true } },
      },
    });

    return expense;
  });

  // Delete expense
  fastify.delete<{ Params: { id: string } }>('/expenses/:id', async (request, reply) => {
    const existing = await fastify.prisma.expense.findFirst({
      where: { id: request.params.id, userId: request.userId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Expense not found' });
    }

    await fastify.prisma.expense.delete({ where: { id: request.params.id } });
    return { success: true };
  });

  // Bulk delete
  fastify.post('/expenses/bulk-delete', async (request, reply) => {
    const body = validateWithZod(reply, bulkDeleteExpensesSchema, request.body);
    if (body === undefined) return;

    const result = await fastify.prisma.expense.deleteMany({
      where: { id: { in: body.ids }, userId: request.userId },
    });

    return { deleted: result.count };
  });

  // Bulk categorize
  fastify.post('/expenses/bulk-categorize', async (request, reply) => {
    const body = validateWithZod(reply, bulkCategorizeExpensesSchema, request.body);
    if (body === undefined) return;

    const result = await fastify.prisma.expense.updateMany({
      where: { id: { in: body.ids }, userId: request.userId },
      data: { categoryId: body.categoryId },
    });

    return { updated: result.count };
  });

  // Update reimbursement status
  fastify.patch<{ Params: { id: string } }>('/expenses/:id/reimburse', async (request, reply) => {
    const existing = await fastify.prisma.expense.findFirst({
      where: { id: request.params.id, userId: request.userId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Expense not found' });
    }

    const body = validateWithZod(reply, reimburseExpenseSchema, request.body);
    if (body === undefined) return;

    const expense = await fastify.prisma.expense.update({
      where: { id: request.params.id },
      data: {
        reimbursementStatus: body.reimbursementStatus,
        ...(body.reimbursedAmount !== undefined && { reimbursedAmount: body.reimbursedAmount }),
        ...(body.reimbursedDate != null && body.reimbursedDate !== '' && { reimbursedDate: new Date(body.reimbursedDate) }),
      },
    });

    return expense;
  });
};

export default expenseRoutes;
