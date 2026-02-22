export const PAYMENT_METHODS = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit', label: 'Debit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
] as const;

export const REIMBURSEMENT_STATUSES = [
  { value: 'none', label: 'Not Reimbursable', color: '#6b7280' },
  { value: 'pending', label: 'Pending', color: '#f59e0b' },
  { value: 'submitted', label: 'Submitted', color: '#3b82f6' },
  { value: 'approved', label: 'Approved', color: '#8b5cf6' },
  { value: 'paid', label: 'Paid', color: '#10b981' },
] as const;

export const DEFAULT_CATEGORY_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
] as const;

export const PROJECT_COLORS = [
  '#3b82f6', '#ef4444', '#f59e0b', '#10b981',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
] as const;
