import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');
const frequency = z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']);

export const createRecurringRuleSchema = z.object({
  frequency,
  interval: z.number().int().positive().optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
  dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
  startDate: dateString,
  endDate: dateString.optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateRecurringRuleSchema = z.object({
  frequency: frequency.optional(),
  interval: z.number().int().positive().optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
  dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
  startDate: dateString.optional(),
  endDate: dateString.optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateRecurringRuleInput = z.infer<typeof createRecurringRuleSchema>;
export type UpdateRecurringRuleInput = z.infer<typeof updateRecurringRuleSchema>;
