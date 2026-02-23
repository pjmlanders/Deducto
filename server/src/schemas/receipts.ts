import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const acceptReceiptSchema = z.object({
  projectId: z.string().uuid(),
  vendor: z.string().min(1, 'Vendor is required').max(500),
  description: z.string().min(1, 'Description is required').max(2000),
  amount: z.number().positive('Amount must be positive'),
  date: dateString,
  categoryId: z.union([z.string().uuid(), z.literal('')]).optional().transform((v) => (v === '' ? undefined : v)),
  taxCategoryId: z.union([z.string().uuid(), z.literal('')]).optional().transform((v) => (v === '' ? undefined : v)),
  isReimbursable: z.boolean().optional(),
  paymentMethod: z.string().max(100).optional().nullable(),
  purchaser: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  isDeductible: z.boolean().optional(),
});

/** Accept multiple receipts as a single expense (batch mode: one expense, many receipts) */
export const acceptBatchReceiptsSchema = z.object({
  receiptIds: z.array(z.string().uuid()).min(1, 'At least one receipt is required'),
  projectId: z.string().uuid(),
  vendor: z.string().min(1, 'Vendor is required').max(500),
  description: z.string().min(1, 'Description is required').max(2000),
  amount: z.number().positive('Amount must be positive'),
  date: dateString,
  categoryId: z.union([z.string().uuid(), z.literal('')]).optional().transform((v) => (v === '' ? undefined : v)),
  taxCategoryId: z.union([z.string().uuid(), z.literal('')]).optional().transform((v) => (v === '' ? undefined : v)),
  isReimbursable: z.boolean().optional(),
  paymentMethod: z.string().max(100).optional().nullable(),
  purchaser: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  isDeductible: z.boolean().optional(),
});

export type AcceptReceiptInput = z.infer<typeof acceptReceiptSchema>;
export type AcceptBatchReceiptsInput = z.infer<typeof acceptBatchReceiptsSchema>;
