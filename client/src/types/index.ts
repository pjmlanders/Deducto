export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { expenses: number; deposits: number };
  summary?: ProjectSummary;
}

export interface ProjectSummary {
  totalExpenses: number;
  expenseCount: number;
  totalDeposits: number;
  depositCount: number;
  netBalance: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string;
  parentId: string | null;
  sortOrder: number;
  isDefault: boolean;
  children?: Category[];
  _count?: { expenses: number };
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  _count?: { expenses: number };
}

export interface TaxCategory {
  id: string;
  code: string;
  name: string;
  schedule: string;
  line: string | null;
  description: string | null;
}

export interface Expense {
  id: string;
  vendor: string;
  description: string;
  amount: string | number;
  currency: string;
  date: string;
  projectId: string;
  project: { id: string; name: string; color: string };
  categoryId: string | null;
  category: { id: string; name: string; icon: string | null; color: string } | null;
  taxCategoryId: string | null;
  taxCategory: { id: string; name: string; schedule: string } | null;
  receiptId: string | null;
  receipt: { id: string; thumbnailPath: string | null; processingStatus: string } | null;
  isReimbursable: boolean;
  reimbursementStatus: string;
  reimbursedAmount: string | number | null;
  reimbursedDate: string | null;
  paymentMethod: string | null;
  purchaser: string | null;
  isRecurring: boolean;
  notes: string | null;
  isDeductible: boolean;
  isCapitalExpense: boolean;
  confidence: number | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  tags: Array<{ tag: Tag }>;
}

export interface ExpenseFormData {
  projectId: string;
  vendor: string;
  description: string;
  amount: number;
  date: string;
  categoryId?: string;
  taxCategoryId?: string;
  receiptId?: string;
  isReimbursable?: boolean;
  isCapitalExpense?: boolean;
  paymentMethod?: string;
  purchaser?: string;
  notes?: string;
  isDeductible?: boolean;
  currency?: string;
  tagIds?: string[];
}

export interface Receipt {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  aiConfidence: number | null;
  extractedVendor: string | null;
  extractedAmount: string | number | null;
  extractedDate: string | null;
  extractedItems: string | null;
  extractedCategory: string | null;
  extractedTaxInfo: string | null;
  isDuplicate: boolean;
  duplicateOfId: string | null;
  createdAt: string;
  expense?: { id: string; vendor: string; amount: number } | null;
}

export interface Deposit {
  id: string;
  source: string;
  description: string | null;
  amount: string | number;
  currency: string;
  date: string;
  projectId: string;
  project: { id: string; name: string; color: string };
  isIncome: boolean;
  incomeCategory: string | null;
  notes: string | null;
  createdAt: string;
}

export interface MileageEntry {
  id: string;
  date: string;
  startLocation: string;
  endLocation: string;
  distance: string | number;
  purpose: string;
  roundTrip: boolean;
  rateUsed: string | number;
  deduction: string | number;
  notes: string | null;
  createdAt: string;
}

export interface Budget {
  id: string;
  projectId: string | null;
  project: { id: string; name: string; color: string } | null;
  categoryId: string | null;
  category: { id: string; name: string; color: string } | null;
  amount: string | number;
  period: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
}

export interface BudgetStatus extends Budget {
  actual: number;
  remaining: number;
  percentage: number;
  status: 'ok' | 'warning' | 'over';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ExpenseFilters {
  projectId?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  vendor?: string;
  minAmount?: string;
  maxAmount?: string;
  reimbursementStatus?: string;
  isDeductible?: string;
  isReimbursable?: string;
  search?: string;
  tagIds?: string;
  source?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}
