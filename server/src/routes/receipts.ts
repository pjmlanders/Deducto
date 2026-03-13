import { FastifyPluginAsync } from 'fastify';
import { Prisma } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import crypto from 'crypto';
import sharp from 'sharp';
import { validateWithZod } from '../utils/validate.js';
import { acceptReceiptSchema, acceptBatchReceiptsSchema } from '../schemas/receipts.js';
import { computeReceiptFingerprint } from '../utils/receiptFingerprint.js';

const receiptRoutes: FastifyPluginAsync = async (fastify) => {
  const uploadDir = process.env.UPLOAD_DIR || './uploads';

  // Ensure upload directory exists
  async function ensureUploadDir(userId: string): Promise<string> {
    const userDir = path.join(uploadDir, 'receipts', userId);
    await fs.mkdir(userDir, { recursive: true });
    return userDir;
  }

  // Upload receipt (multipart file)
  fastify.post('/receipts/upload', async (request, reply) => {
    const file = await request.file();

    if (!file) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
    if (!allowedTypes.includes(file.mimetype)) {
      return reply.status(400).send({
        error: 'Invalid file type. Allowed: JPEG, PNG, WebP, HEIC, PDF',
      });
    }

    const userDir = await ensureUploadDir(request.userId);
    const ext = path.extname(file.filename) || `.${file.mimetype.split('/')[1]}`;
    const fileName = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(userDir, fileName);

    // Save file
    const rawBuffer = await file.toBuffer();
    // Compress images to reduce storage (PDFs passed through unchanged)
    const { buffer, mimeType: storedMimeType } = await compressImage(rawBuffer, file.mimetype);
    // Best-effort disk write (ephemeral on Railway — DB is the source of truth)
    try { await fs.writeFile(filePath, buffer); } catch { /* ignore */ }

    const receipt = await fastify.prisma.receipt.create({
      data: {
        userId: request.userId,
        fileName,
        originalName: file.filename,
        mimeType: storedMimeType,
        fileSize: buffer.length,
        storagePath: filePath,
        storageType: 'local',
        processingStatus: 'pending',
        fileData: buffer as unknown as Uint8Array<ArrayBuffer>,
      },
      omit: { fileData: true },
    });

    return reply.status(201).send(receipt);
  });

  // Upload from camera capture (base64)
  fastify.post<{
    Body: { image: string; mimeType?: string };
  }>('/receipts/capture', async (request, reply) => {
    const { image, mimeType = 'image/jpeg' } = request.body;

    if (!image) {
      return reply.status(400).send({ error: 'No image data provided' });
    }

    // Strip data URL prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    // Validate size before decoding (base64 is ~33% larger than binary)
    const maxBase64Length = Math.ceil(10 * 1024 * 1024 * 4 / 3); // 10MB in base64
    if (base64Data.length > maxBase64Length) {
      return reply.status(400).send({ error: 'Image too large. Maximum size is 10MB.' });
    }

    const rawBuffer = Buffer.from(base64Data, 'base64');
    // Compress captured image before storing
    const { buffer, mimeType: storedMimeType } = await compressImage(rawBuffer, mimeType);

    const userDir = await ensureUploadDir(request.userId);
    const ext = storedMimeType === 'image/png' ? '.png' : '.jpg';
    const fileName = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(userDir, fileName);

    // Best-effort disk write (ephemeral on Railway — DB is the source of truth)
    try { await fs.writeFile(filePath, buffer); } catch { /* ignore */ }

    const receipt = await fastify.prisma.receipt.create({
      data: {
        userId: request.userId,
        fileName,
        originalName: `capture${ext}`,
        mimeType: storedMimeType,
        fileSize: buffer.length,
        storagePath: filePath,
        storageType: 'local',
        processingStatus: 'pending',
        fileData: buffer as unknown as Uint8Array<ArrayBuffer>,
      },
      omit: { fileData: true },
    });

    return reply.status(201).send(receipt);
  });

  // Count receipts that need user attention (failed, duplicate, or incomplete extraction)
  fastify.get('/receipts/issues-count', async (request) => {
    const count = await fastify.prisma.receipt.count({
      where: {
        userId: request.userId,
        expenseId: null,
        OR: [
          { processingStatus: 'failed' },
          { isDuplicate: true },
          {
            processingStatus: 'completed',
            AND: [
              { extractedVendor: null },
            ],
          },
          {
            processingStatus: 'completed',
            AND: [
              { extractedAmount: null },
            ],
          },
        ],
      },
    });
    return { count };
  });

  // List receipts (supports ?status=pending to find unreviewed ones)
  fastify.get('/receipts', async (request) => {
    const query = request.query as Record<string, string>;
    const page = parseInt(query.page) || 1;
    const limit = Math.min(parseInt(query.limit) || 100, 500);

    const where: Prisma.ReceiptWhereInput = { userId: request.userId };

    if (query.status === 'pending') {
      where.expenseId = null;
    } else if (query.status) {
      where.processingStatus = query.status;
    }

    const receipts = await fastify.prisma.receipt.findMany({
      where,
      omit: { fileData: true },
      include: {
        expense: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return receipts;
  });

  // Get receipt metadata
  fastify.get<{ Params: { id: string } }>('/receipts/:id', async (request, reply) => {
    const receipt = await fastify.prisma.receipt.findFirst({
      where: { id: request.params.id, userId: request.userId },
      omit: { fileData: true },
      include: { expense: { select: { id: true, vendor: true, amount: true } } },
    });

    if (!receipt) {
      return reply.status(404).send({ error: 'Receipt not found' });
    }

    return receipt;
  });

  // Serve receipt file
  fastify.get<{ Params: { id: string } }>('/receipts/:id/file', async (request, reply) => {
    const receipt = await fastify.prisma.receipt.findFirst({
      where: { id: request.params.id, userId: request.userId },
    });

    if (!receipt) {
      return reply.status(404).send({ error: 'Receipt not found' });
    }

    // Prefer DB-stored bytes; fall back to disk for legacy receipts
    if (receipt.fileData) {
      reply.type(receipt.mimeType);
      return reply.send(Buffer.from(receipt.fileData as Uint8Array));
    }

    try {
      await fs.access(receipt.storagePath);
      const stream = createReadStream(receipt.storagePath);
      reply.type(receipt.mimeType);
      return reply.send(stream);
    } catch {
      return reply.status(404).send({ error: 'Receipt file not found' });
    }
  });

  // Serve receipt as image preview (converts HEIC to JPEG; PDFs served as-is for browser viewer)
  fastify.get<{ Params: { id: string } }>('/receipts/:id/preview', async (request, reply) => {
    const receipt = await fastify.prisma.receipt.findFirst({
      where: { id: request.params.id, userId: request.userId },
    });

    if (!receipt) {
      return reply.status(404).send({ error: 'Receipt not found' });
    }

    try {
      // Prefer DB-stored bytes; fall back to disk for legacy receipts
      let fileBuffer: Buffer;
      if (receipt.fileData) {
        fileBuffer = Buffer.from(receipt.fileData as Uint8Array);
      } else {
        fileBuffer = await fs.readFile(receipt.storagePath);
      }

      // Browser-native formats: serve directly (including PDF for <object>/<iframe>)
      const nativeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
      if (nativeTypes.includes(receipt.mimeType)) {
        reply.type(receipt.mimeType);
        return reply.send(fileBuffer);
      }

      // Convert HEIC, TIFF, etc. to JPEG
      const converted = await sharp(fileBuffer).jpeg({ quality: 85 }).toBuffer();
      reply.type('image/jpeg');
      return reply.send(converted);
    } catch (err) {
      fastify.log.error(err, 'Preview conversion failed');
      return reply.status(422).send({ error: 'Cannot generate preview for this file type' });
    }
  });

  // Trigger AI processing
  fastify.post<{ Params: { id: string } }>('/receipts/:id/process', async (request, reply) => {
    const receipt = await fastify.prisma.receipt.findFirst({
      where: { id: request.params.id, userId: request.userId },
    });

    if (!receipt) {
      return reply.status(404).send({ error: 'Receipt not found' });
    }

    if (receipt.processingStatus === 'processing') {
      return reply.status(409).send({ error: 'Receipt is already being processed' });
    }

    // Update status to processing
    await fastify.prisma.receipt.update({
      where: { id: receipt.id },
      data: { processingStatus: 'processing' },
    });

    // Process asynchronously (don't await)
    processReceiptAsync(fastify, receipt.id, request.userId).catch((err) => {
      fastify.log.error(err, 'Receipt processing failed');
    });

    return { status: 'processing', receiptId: receipt.id };
  });

  // Poll processing status
  fastify.get<{ Params: { id: string } }>('/receipts/:id/status', async (request, reply) => {
    const receipt = await fastify.prisma.receipt.findFirst({
      where: { id: request.params.id, userId: request.userId },
      select: {
        id: true,
        mimeType: true,
        processingStatus: true,
        aiConfidence: true,
        extractedVendor: true,
        extractedAmount: true,
        extractedDate: true,
        extractedItems: true,
        extractedCategory: true,
        extractedTaxInfo: true,
        isDuplicate: true,
        duplicateOfId: true,
      },
    });

    if (!receipt) {
      return reply.status(404).send({ error: 'Receipt not found' });
    }

    return receipt;
  });

  // Accept AI results and create expense
  fastify.post<{ Params: { id: string } }>('/receipts/:id/accept', async (request, reply) => {
    const receipt = await fastify.prisma.receipt.findFirst({
      where: { id: request.params.id, userId: request.userId },
    });

    if (!receipt) {
      return reply.status(404).send({ error: 'Receipt not found' });
    }

    const body = validateWithZod(reply, acceptReceiptSchema, request.body);
    if (body === undefined) return;

    const expense = await fastify.prisma.expense.create({
      data: {
        userId: request.userId,
        projectId: body.projectId,
        vendor: body.vendor,
        description: body.description,
        amount: body.amount,
        date: new Date(body.date),
        categoryId: body.categoryId ?? null,
        taxCategoryId: body.taxCategoryId ?? null,
        receiptId: receipt.id,
        isReimbursable: body.isReimbursable ?? false,
        paymentMethod: body.paymentMethod ?? null,
        purchaser: body.purchaser ?? null,
        notes: body.notes ?? null,
        isDeductible: body.isDeductible ?? false,
        confidence: receipt.aiConfidence,
        source: 'receipt_scan',
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        category: true,
        receipt: true,
        receipts: true,
      },
    });

    await fastify.prisma.receipt.update({
      where: { id: receipt.id },
      data: { expenseId: expense.id },
    });

    const withReceipts = await fastify.prisma.expense.findUnique({
      where: { id: expense.id },
      include: {
        project: { select: { id: true, name: true, color: true } },
        category: true,
        receipt: true,
        receipts: { select: { id: true, thumbnailPath: true, processingStatus: true, originalName: true, mimeType: true } },
      },
    });

    return reply.status(201).send(withReceipts ?? expense);
  });

  // Accept multiple receipts as one expense (batch: one expense, many receipts)
  fastify.post('/receipts/accept-batch', async (request, reply) => {
    const body = validateWithZod(reply, acceptBatchReceiptsSchema, request.body);
    if (body === undefined) return;

    const receiptIds = body.receiptIds;
    const receipts = await fastify.prisma.receipt.findMany({
      where: { id: { in: receiptIds }, userId: request.userId, expenseId: null },
    });
    if (receipts.length !== receiptIds.length) {
      return reply.status(400).send({
        error: 'One or more receipts not found or already attached to an expense',
      });
    }

    const firstReceipt = receipts[0];
    const expense = await fastify.prisma.expense.create({
      data: {
        userId: request.userId,
        projectId: body.projectId,
        vendor: body.vendor,
        description: body.description,
        amount: body.amount,
        date: new Date(body.date),
        categoryId: body.categoryId ?? null,
        taxCategoryId: body.taxCategoryId ?? null,
        receiptId: firstReceipt.id,
        isReimbursable: body.isReimbursable ?? false,
        paymentMethod: body.paymentMethod ?? null,
        purchaser: body.purchaser ?? null,
        notes: body.notes ?? null,
        isDeductible: body.isDeductible ?? false,
        confidence: firstReceipt.aiConfidence,
        source: 'receipt_scan',
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        category: true,
        receipts: { select: { id: true, thumbnailPath: true, processingStatus: true, originalName: true, mimeType: true } },
      },
    });

    await fastify.prisma.receipt.updateMany({
      where: { id: { in: receiptIds } },
      data: { expenseId: expense.id },
    });

    const withReceipts = await fastify.prisma.expense.findUnique({
      where: { id: expense.id },
      include: {
        project: { select: { id: true, name: true, color: true } },
        category: true,
        receipt: true,
        receipts: { select: { id: true, thumbnailPath: true, processingStatus: true, originalName: true, mimeType: true } },
      },
    });

    return reply.status(201).send(withReceipts ?? expense);
  });

  // Delete all pending (unlinked) receipts for the user
  fastify.delete('/receipts', async (request) => {
    await fastify.prisma.receipt.deleteMany({
      where: { userId: request.userId, expenseId: null },
    });
    return { success: true };
  });

  // Delete receipt
  fastify.delete<{ Params: { id: string } }>('/receipts/:id', async (request, reply) => {
    const receipt = await fastify.prisma.receipt.findFirst({
      where: { id: request.params.id, userId: request.userId },
    });

    if (!receipt) {
      return reply.status(404).send({ error: 'Receipt not found' });
    }

    // Delete file from storage
    try {
      await fs.unlink(receipt.storagePath);
      if (receipt.thumbnailPath) {
        await fs.unlink(receipt.thumbnailPath);
      }
    } catch {
      // File may already be deleted
    }

    await fastify.prisma.receipt.delete({ where: { id: receipt.id } });
    return { success: true };
  });
};

// Compress images before storage — PDFs passed through unchanged
async function compressImage(buffer: Buffer, mimeType: string): Promise<{ buffer: Buffer; mimeType: string }> {
  if (mimeType === 'application/pdf') {
    return { buffer: Buffer.from(buffer), mimeType };
  }
  const compressed = await sharp(buffer)
    .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  return { buffer: Buffer.from(compressed), mimeType: 'image/jpeg' };
}

// Async receipt processing with Claude AI
async function processReceiptAsync(
  fastify: any,
  receiptId: string,
  userId: string
) {
  try {
    const receipt = await fastify.prisma.receipt.findUnique({
      where: { id: receiptId },
    });

    if (!receipt) return;

    // Prefer DB-stored bytes; fall back to disk for legacy receipts
    let fileBuffer: Buffer;
    if (receipt.fileData) {
      fileBuffer = Buffer.from(receipt.fileData as Uint8Array);
    } else {
      fileBuffer = await (await import('fs/promises')).readFile(receipt.storagePath);
    }

    // Get user categories for AI context
    const categories = await fastify.prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true, color: true },
    });
    const categoryNames = categories.map((c: any) => c.name);

    // Import and call AI processor
    const { processReceipt } = await import('../services/ai/receiptProcessor.js');
    const result = await processReceipt(fileBuffer, receipt.mimeType, categoryNames);

    // Compute fingerprint for duplicate detection
    let fingerprint: string | null = null;
    let isDuplicate = false;
    let duplicateOfId: string | null = null;

    if (result.vendor && result.amount && result.date) {
      fingerprint = computeReceiptFingerprint(result.vendor, result.amount, result.date);

      // Check for duplicates
      const existing = await fastify.prisma.receipt.findFirst({
        where: {
          fingerprint,
          id: { not: receiptId },
          userId,
        },
        select: { id: true },
      });

      if (existing) {
        isDuplicate = true;
        duplicateOfId = existing.id;
      }
    }

    // Resolve AI category to a category ID, creating a new one if needed
    let suggestedCategoryId: string | null = null;
    let matchedCategoryName = result.category;

    if (result.category) {
      const aiName = result.category.trim();
      const lower = aiName.toLowerCase();

      // 1. Exact case-insensitive match
      let match = categories.find((c: any) => c.name.toLowerCase() === lower);

      // 2. Fuzzy: AI name contains existing category name or vice versa
      if (!match) {
        match = categories.find((c: any) => {
          const cn = c.name.toLowerCase();
          return lower.includes(cn) || cn.includes(lower);
        });
      }

      if (match) {
        suggestedCategoryId = match.id;
        matchedCategoryName = match.name;
      } else {
        // 3. No match — create a new category for the user
        const CATEGORY_COLORS = [
          '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
          '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
        ];
        // Pick a color deterministically based on name hash
        let hash = 0;
        for (let i = 0; i < aiName.length; i++) hash = (hash * 31 + aiName.charCodeAt(i)) >>> 0;
        const color = CATEGORY_COLORS[hash % CATEGORY_COLORS.length];

        try {
          const newCategory = await fastify.prisma.category.create({
            data: { userId, name: aiName, color, isDefault: false },
          });
          suggestedCategoryId = newCategory.id;
          matchedCategoryName = newCategory.name;
          fastify.log.info({ categoryName: aiName }, 'Auto-created category from AI receipt scan');
        } catch {
          // Category with this name may already exist for a different user — skip
        }
      }
    }

    await fastify.prisma.receipt.update({
      where: { id: receiptId },
      data: {
        processingStatus: 'completed',
        aiRawResponse: JSON.stringify(result),
        aiConfidence: result.confidence,
        extractedVendor: result.vendor,
        extractedAmount: result.amount,
        extractedDate: result.date ? new Date(result.date) : null,
        extractedItems: result.items ? JSON.stringify(result.items) : null,
        extractedCategory: matchedCategoryName,
        extractedTaxInfo: result.tax != null || result.tip != null
          ? JSON.stringify({ tax: result.tax, tip: result.tip, subtotal: result.subtotal })
          : null,
        fingerprint,
        isDuplicate,
        duplicateOfId,
        suggestedCategoryId,
      },
    });
  } catch (err) {
    fastify.log.error(err, 'Receipt processing error');
    await fastify.prisma.receipt.update({
      where: { id: receiptId },
      data: { processingStatus: 'failed' },
    });
  }
}

export default receiptRoutes;
