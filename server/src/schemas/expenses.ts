import { z } from 'zod';

const uuid = z.string().uuid().optional();
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const createExpenseSchema = z.object({
  projectId: z.string().uuid(),
  vendor: z.string().min(1, 'Vendor is required').max(500),
  description: z.string().min(1, 'Description is required').max(2000),
  amount: z.number().positive('Amount must be positive'),
  date: dateString,
  categoryId: z.union([z.string().uuid(), z.literal('')]).optional().transform((v) => (v === '' ? undefined : v)),
  taxCategoryId: z.union([z.string().uuid(), z.literal('')]).optional().transform((v) => (v === '' ? undefined : v)),
  receiptId: uuid,
  isReimbursable: z.boolean().optional(),
  paymentMethod: z.string().max(100).optional().nullable(),
  purchaser: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  isDeductible: z.boolean().optional(),
  isCapitalExpense: z.boolean().optional(),
  currency: z.string().length(3).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

export const updateExpenseSchema = z.object({
  vendor: z.string().min(1).max(500).optional(),
  description: z.string().min(1).max(2000).optional(),
  amount: z.number().positive().optional(),
  date: dateString.optional(),
  projectId: z.string().uuid().optional(),
  categoryId: z.union([z.string().uuid(), z.literal('')]).optional().transform((v) => (v === '' ? null : v)),
  taxCategoryId: z.union([z.string().uuid(), z.literal('')]).optional().transform((v) => (v === '' ? null : v)),
  isReimbursable: z.boolean().optional(),
  reimbursementStatus: z.string().max(50).optional(),
  reimbursedAmount: z.number().nonnegative().optional().nullable(),
  reimbursedDate: dateString.optional().nullable(),
  paymentMethod: z.string().max(100).optional().nullable(),
  purchaser: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  isDeductible: z.boolean().optional(),
  isCapitalExpense: z.boolean().optional(),
  currency: z.string().length(3).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

export const bulkDeleteExpensesSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one id is required'),
});

export const bulkCategorizeExpensesSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one id is required'),
  categoryId: z.string().uuid(),
});

export const reimburseExpenseSchema = z.object({
  reimbursementStatus: z.string().min(1).max(50),
  reimbursedAmount: z.number().nonnegative().optional(),
  reimbursedDate: dateString.optional(),
});

export const attachReceiptToExpenseSchema = z.object({
  receiptId: z.string().uuid(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ReimburseExpenseInput = z.infer<typeof reimburseExpenseSchema>;
export type AttachReceiptToExpenseInput = z.infer<typeof attachReceiptToExpenseSchema>;
