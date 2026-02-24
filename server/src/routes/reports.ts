import { FastifyPluginAsync } from 'fastify';
import { Prisma } from '@prisma/client';
import { stringify } from 'csv-stringify/sync';
import PDFDocument from 'pdfkit';

const reportRoutes: FastifyPluginAsync = async (fastify) => {
  const EXPORT_DISCLAIMER =
    'Deducto is not a tax advisor. This export is for your records only. Consult a qualified tax professional for advice.';
  // Monthly summary
  fastify.get('/reports/monthly', async (request) => {
    const query = request.query as Record<string, string>;
    const year = parseInt(query.year) || new Date().getFullYear();
    const month = parseInt(query.month) || new Date().getMonth() + 1;
    const projectId = query.projectId;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const expenseWhere: Prisma.ExpenseWhereInput = {
      userId: request.userId,
      date: { gte: startDate, lte: endDate },
      ...(projectId && { projectId }),
    };

    const depositWhere: Prisma.DepositWhereInput = {
      userId: request.userId,
      date: { gte: startDate, lte: endDate },
      ...(projectId && { projectId }),
    };

    const [expenseTotal, depositTotal, categoryBreakdown, topVendors, dailySpending] =
      await Promise.all([
        fastify.prisma.expense.aggregate({
          where: expenseWhere,
          _sum: { amount: true },
          _count: true,
        }),
        fastify.prisma.deposit.aggregate({
          where: depositWhere,
          _sum: { amount: true },
          _count: true,
        }),
        fastify.prisma.expense.groupBy({
          by: ['categoryId'],
          where: expenseWhere,
          _sum: { amount: true },
          _count: true,
          orderBy: { _sum: { amount: 'desc' } },
        }),
        fastify.prisma.expense.groupBy({
          by: ['vendor'],
          where: expenseWhere,
          _sum: { amount: true },
          _count: true,
          orderBy: { _sum: { amount: 'desc' } },
          take: 10,
        }),
        // Daily spending for chart
        fastify.prisma.$queryRaw`
          SELECT DATE(date) as day, SUM(amount) as total
          FROM "Expense"
          WHERE "userId" = ${request.userId}
            AND date >= ${startDate}
            AND date <= ${endDate}
            ${projectId ? Prisma.sql`AND "projectId" = ${projectId}` : Prisma.empty}
          GROUP BY DATE(date)
          ORDER BY day
        `,
      ]);

    // Resolve category names
    const categoryIds = categoryBreakdown
      .map((c) => c.categoryId)
      .filter(Boolean) as string[];
    const categories = categoryIds.length
      ? await fastify.prisma.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true, color: true, icon: true },
        })
      : [];

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    return {
      period: { year, month },
      expenses: {
        total: expenseTotal._sum.amount || 0,
        count: expenseTotal._count,
      },
      deposits: {
        total: depositTotal._sum.amount || 0,
        count: depositTotal._count,
      },
      net: Number(depositTotal._sum.amount || 0) - Number(expenseTotal._sum.amount || 0),
      categoryBreakdown: categoryBreakdown.map((c) => ({
        category: c.categoryId ? (categoryMap.get(c.categoryId) ?? { name: 'Uncategorized' }) : { name: 'Uncategorized' },
        total: c._sum.amount,
        count: c._count,
      })),
      topVendors: topVendors.map((v) => ({
        vendor: v.vendor,
        total: v._sum.amount,
        count: v._count,
      })),
      dailySpending,
    };
  });

  // Yearly summary
  fastify.get('/reports/yearly', async (request) => {
    const query = request.query as Record<string, string>;
    const year = parseInt(query.year) || new Date().getFullYear();
    const projectId = query.projectId;

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const expenseWhere: Prisma.ExpenseWhereInput = {
      userId: request.userId,
      date: { gte: startDate, lte: endDate },
      ...(projectId && { projectId }),
    };

    const [expenseTotal, depositTotal, monthlySpending, categoryBreakdown] =
      await Promise.all([
        fastify.prisma.expense.aggregate({
          where: expenseWhere,
          _sum: { amount: true },
          _count: true,
        }),
        fastify.prisma.deposit.aggregate({
          where: {
            userId: request.userId,
            date: { gte: startDate, lte: endDate },
            ...(projectId && { projectId }),
          },
          _sum: { amount: true },
          _count: true,
        }),
        // Monthly totals for trend chart
        fastify.prisma.$queryRaw`
          SELECT EXTRACT(MONTH FROM date) as month, SUM(amount) as total, COUNT(*)::int as count
          FROM "Expense"
          WHERE "userId" = ${request.userId}
            AND date >= ${startDate}
            AND date <= ${endDate}
            ${projectId ? Prisma.sql`AND "projectId" = ${projectId}` : Prisma.empty}
          GROUP BY EXTRACT(MONTH FROM date)
          ORDER BY month
        `,
        fastify.prisma.expense.groupBy({
          by: ['categoryId'],
          where: expenseWhere,
          _sum: { amount: true },
          _count: true,
          orderBy: { _sum: { amount: 'desc' } },
        }),
      ]);

    const categoryIds = categoryBreakdown
      .map((c) => c.categoryId)
      .filter(Boolean) as string[];
    const categories = categoryIds.length
      ? await fastify.prisma.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true, color: true },
        })
      : [];
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    return {
      year,
      expenses: {
        total: expenseTotal._sum.amount || 0,
        count: expenseTotal._count,
      },
      deposits: {
        total: depositTotal._sum.amount || 0,
        count: depositTotal._count,
      },
      net: Number(depositTotal._sum.amount || 0) - Number(expenseTotal._sum.amount || 0),
      monthlySpending,
      categoryBreakdown: categoryBreakdown.map((c) => ({
        category: c.categoryId ? (categoryMap.get(c.categoryId) ?? { name: 'Uncategorized' }) : { name: 'Uncategorized' },
        total: c._sum.amount,
        count: c._count,
      })),
    };
  });

  // Tax report
  fastify.get('/reports/tax', async (request) => {
    const query = request.query as Record<string, string>;
    const year = parseInt(query.year) || new Date().getFullYear();

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const [deductibleExpenses, mileageSummary, depositTotal] = await Promise.all([
      fastify.prisma.expense.findMany({
        where: {
          userId: request.userId,
          date: { gte: startDate, lte: endDate },
          isDeductible: true,
        },
        include: {
          taxCategory: true,
          category: { select: { name: true } },
          project: { select: { name: true } },
        },
        orderBy: { date: 'asc' },
      }),
      fastify.prisma.mileageEntry.aggregate({
        where: {
          userId: request.userId,
          date: { gte: startDate, lte: endDate },
        },
        _sum: { deduction: true, distance: true },
        _count: true,
      }),
      fastify.prisma.deposit.aggregate({
        where: {
          userId: request.userId,
          date: { gte: startDate, lte: endDate },
          isIncome: true,
        },
        _sum: { amount: true },
      }),
    ]);

    // Group by tax category / schedule
    const bySchedule: Record<string, any[]> = {};
    for (const expense of deductibleExpenses) {
      const schedule = expense.taxCategory?.schedule || 'Uncategorized';
      if (!bySchedule[schedule]) bySchedule[schedule] = [];
      bySchedule[schedule].push({
        id: expense.id,
        vendor: expense.vendor,
        description: expense.description,
        amount: expense.amount,
        date: expense.date,
        taxCategory: expense.taxCategory?.name || 'Uncategorized',
        taxLine: expense.taxCategory?.line,
        category: expense.category?.name,
        project: expense.project.name,
      });
    }

    // Compute totals per schedule
    const scheduleTotals: Record<string, number> = {};
    for (const [schedule, expenses] of Object.entries(bySchedule)) {
      scheduleTotals[schedule] = expenses.reduce(
        (sum, e) => sum + Number(e.amount),
        0
      );
    }

    return {
      year,
      totalDeductibleExpenses: deductibleExpenses.reduce(
        (sum, e) => sum + Number(e.amount),
        0
      ),
      totalIncome: depositTotal._sum.amount || 0,
      mileage: {
        totalMiles: mileageSummary._sum.distance || 0,
        totalDeduction: mileageSummary._sum.deduction || 0,
        tripCount: mileageSummary._count,
      },
      bySchedule,
      scheduleTotals,
    };
  });

  // Reimbursement report
  fastify.get('/reports/reimbursement', async (request) => {
    const query = request.query as Record<string, string>;
    const status = query.status;

    const where: Prisma.ExpenseWhereInput = {
      userId: request.userId,
      isReimbursable: true,
      ...(status && { reimbursementStatus: status }),
    };

    const expenses = await fastify.prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        project: { select: { id: true, name: true } },
        category: { select: { name: true } },
      },
    });

    const summary = {
      total: expenses.reduce((sum, e) => sum + Number(e.amount), 0),
      reimbursed: expenses
        .filter((e) => e.reimbursementStatus === 'paid')
        .reduce((sum, e) => sum + Number(e.reimbursedAmount || e.amount), 0),
      pending: expenses
        .filter((e) => ['pending', 'submitted', 'approved'].includes(e.reimbursementStatus))
        .reduce((sum, e) => sum + Number(e.amount), 0),
      count: expenses.length,
    };

    return { expenses, summary };
  });

  // Category breakdown
  fastify.get('/reports/category-breakdown', async (request) => {
    const query = request.query as Record<string, string>;
    const projectId = query.projectId;
    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
    const dateTo = query.dateTo ? new Date(query.dateTo) : undefined;

    const where: Prisma.ExpenseWhereInput = {
      userId: request.userId,
      ...(projectId && { projectId }),
      ...(dateFrom || dateTo
        ? {
            date: {
              ...(dateFrom && { gte: dateFrom }),
              ...(dateTo && { lte: dateTo }),
            },
          }
        : {}),
    };

    const breakdown = await fastify.prisma.expense.groupBy({
      by: ['categoryId'],
      where,
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
    });

    const categoryIds = breakdown.map((b) => b.categoryId).filter(Boolean) as string[];
    const categories = categoryIds.length
      ? await fastify.prisma.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true, color: true, icon: true },
        })
      : [];
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const total = breakdown.reduce((sum, b) => sum + Number(b._sum.amount || 0), 0);

    return breakdown.map((b) => ({
      category: b.categoryId ? (categoryMap.get(b.categoryId) ?? { name: 'Uncategorized', color: '#9ca3af' }) : { name: 'Uncategorized', color: '#9ca3af' },
      total: b._sum.amount,
      count: b._count,
      percentage: total > 0 ? (Number(b._sum.amount || 0) / total) * 100 : 0,
    }));
  });

  // Spending trend (last N months)
  fastify.get('/reports/trend', async (request) => {
    const query = request.query as Record<string, string>;
    const months = parseInt(query.months) || 12;
    const projectId = query.projectId;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const trend = await fastify.prisma.$queryRaw`
      SELECT
        EXTRACT(YEAR FROM date) as year,
        EXTRACT(MONTH FROM date) as month,
        SUM(amount) as total,
        COUNT(*)::int as count
      FROM "Expense"
      WHERE "userId" = ${request.userId}
        AND date >= ${startDate}
        AND date <= ${endDate}
        ${projectId ? Prisma.sql`AND "projectId" = ${projectId}` : Prisma.empty}
      GROUP BY EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date)
      ORDER BY year, month
    `;

    return trend;
  });

  // CSV export
  fastify.get('/reports/export/csv', async (request, reply) => {
    const query = request.query as Record<string, string>;
    const year = parseInt(query.year) || new Date().getFullYear();
    const month = query.month ? parseInt(query.month) : undefined;
    const projectId = query.projectId;

    const startDate = month
      ? new Date(year, month - 1, 1)
      : new Date(year, 0, 1);
    const endDate = month
      ? new Date(year, month, 0, 23, 59, 59)
      : new Date(year, 11, 31, 23, 59, 59);

    const expenses = await fastify.prisma.expense.findMany({
      where: {
        userId: request.userId,
        date: { gte: startDate, lte: endDate },
        ...(projectId && { projectId }),
      },
      include: {
        project: { select: { name: true } },
        category: { select: { name: true } },
        taxCategory: { select: { name: true, schedule: true, line: true } },
      },
      orderBy: { date: 'asc' },
    });

    }));

    const disclaimerRow: Record<string, string> = {
      Date: '',
      Vendor: '',
      Description: EXPORT_DISCLAIMER,
      Amount: '',
      Project: '',
      Category: '',
      'Payment Method': '',
      Purchaser: '',
      Reimbursable: '',
      'Reimbursement Status': '',
      'Tax Deductible': '',
      'Tax Category': '',
      'Tax Schedule': '',
      Notes: '',
    };
    const dataRows = expenses.map((e) => ({
      Date: e.date.toISOString().split('T')[0],
      Vendor: e.vendor,
      Description: e.description,
      Amount: Number(e.amount).toFixed(2),
      Project: e.project.name,
      Category: e.category?.name || '',
      'Payment Method': e.paymentMethod || '',
      Purchaser: e.purchaser || '',
      Reimbursable: e.isReimbursable ? 'Yes' : 'No',
      'Reimbursement Status': e.reimbursementStatus || '',
      'Tax Deductible': e.isDeductible ? 'Yes' : 'No',
      'Tax Category': e.taxCategory?.name || '',
      'Tax Schedule': e.taxCategory?.schedule || '',
      Notes: e.notes || '',
    }));

    const rows = [disclaimerRow, ...dataRows];
    const csv = stringify(rows, { header: true });

    const filename = month
      ? `expenses-${year}-${String(month).padStart(2, '0')}.csv`
      : `expenses-${year}.csv`;

    reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(csv);
  });

  // PDF export
  fastify.get('/reports/export/pdf', async (request, reply) => {
    const query = request.query as Record<string, string>;
    const year = parseInt(query.year) || new Date().getFullYear();
    const month = query.month ? parseInt(query.month) : undefined;
    const projectId = query.projectId;

    const startDate = month
      ? new Date(year, month - 1, 1)
      : new Date(year, 0, 1);
    const endDate = month
      ? new Date(year, month, 0, 23, 59, 59)
      : new Date(year, 11, 31, 23, 59, 59);

    const [expenses, expenseTotal, depositTotal] = await Promise.all([
      fastify.prisma.expense.findMany({
        where: {
          userId: request.userId,
          date: { gte: startDate, lte: endDate },
          ...(projectId && { projectId }),
        },
        include: {
          project: { select: { name: true } },
          category: { select: { name: true } },
        },
        orderBy: { date: 'asc' },
      }),
      fastify.prisma.expense.aggregate({
        where: {
          userId: request.userId,
          date: { gte: startDate, lte: endDate },
          ...(projectId && { projectId }),
        },
        _sum: { amount: true },
        _count: true,
      }),
      fastify.prisma.deposit.aggregate({
        where: {
          userId: request.userId,
          date: { gte: startDate, lte: endDate },
          ...(projectId && { projectId }),
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const pdfReady = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    const periodLabel = month
      ? `${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}`
      : `Year ${year}`;

    // Header
    doc.fontSize(20).text('Expense Report', { align: 'center' });
    doc.fontSize(12).text(periodLabel, { align: 'center' });
    doc.fontSize(8).text(EXPORT_DISCLAIMER, { align: 'center' });
    doc.moveDown(1.5);

    // Summary
    const totalExpenses = Number(expenseTotal._sum.amount || 0);
    const totalDeposits = Number(depositTotal._sum.amount || 0);
    const net = totalDeposits - totalExpenses;

    doc.fontSize(14).text('Summary');
    doc.moveDown(0.5);
    doc.fontSize(10)
      .text(`Total Expenses: $${totalExpenses.toFixed(2)} (${expenseTotal._count} transactions)`)
      .text(`Total Deposits: $${totalDeposits.toFixed(2)} (${depositTotal._count} deposits)`)
      .text(`Net: $${net.toFixed(2)}`);
    doc.moveDown(1);

    // Expenses table
    doc.fontSize(14).text('Expenses');
    doc.moveDown(0.5);

    // Table header
    const col = { date: 50, vendor: 140, desc: 280, cat: 400, amount: 480 };
    doc.fontSize(8).font('Helvetica-Bold');
    const headerY = doc.y;
    doc.text('Date', col.date, headerY);
    doc.text('Vendor', col.vendor, headerY);
    doc.text('Description', col.desc, headerY);
    doc.text('Category', col.cat, headerY);
    doc.text('Amount', col.amount, headerY);
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);

    doc.font('Helvetica').fontSize(8);

    for (const expense of expenses) {
      if (doc.y > 750) {
        doc.addPage();
        doc.y = 50;
      }

      const rowY = doc.y;
      doc.text(expense.date.toISOString().split('T')[0], col.date, rowY);
      doc.text(expense.vendor.substring(0, 20), col.vendor, rowY);
      doc.text(expense.description.substring(0, 20), col.desc, rowY);
      doc.text(expense.category?.name || '-', col.cat, rowY);
      doc.text(`$${Number(expense.amount).toFixed(2)}`, col.amount, rowY);
      doc.moveDown(0.2);
    }

    // Total line
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold');
    doc.text(`Total: $${totalExpenses.toFixed(2)}`, col.amount, doc.y);

    doc.end();

    const pdfBuffer = await pdfReady;

    const filename = month
      ? `expense-report-${year}-${String(month).padStart(2, '0')}.pdf`
      : `expense-report-${year}.pdf`;

    reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(pdfBuffer);
  });
};

export default reportRoutes;
