// Shared types between client and server
// These can be imported by either workspace

export interface ApiError {
  error: string;
  statusCode?: number;
}

export type ReimbursementStatus = 'none' | 'pending' | 'submitted' | 'approved' | 'paid';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ExpenseSource = 'manual' | 'receipt_scan' | 'import' | 'recurring';
export type BudgetPeriod = 'monthly' | 'quarterly' | 'yearly';
export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
