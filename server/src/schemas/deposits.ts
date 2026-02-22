import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const createDepositSchema = z.object({
  projectId: z.string().uuid(),
  source: z.string().min(1, 'Source is required').max(200),
  amount: z.number(),
  date: dateString,
  description: z.string().max(1000).optional().nullable(),
  incomeCategory: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  currency: z.string().length(3).optional(),
});

export const updateDepositSchema = z.object({
  source: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  amount: z.number().optional(),
  date: dateString.optional(),
  projectId: z.string().uuid().optional(),
  incomeCategory: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  currency: z.string().length(3).optional(),
});

export type CreateDepositInput = z.infer<typeof createDepositSchema>;
export type UpdateDepositInput = z.infer<typeof updateDepositSchema>;
