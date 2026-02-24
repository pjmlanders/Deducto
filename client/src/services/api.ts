import axios from 'axios';
import { toast } from 'sonner';
import type {
  Project,
  Expense,
  ExpenseFormData,
  ExpenseFilters,
  Category,
  TaxCategory,
  Tag,
  Deposit,
  Receipt,
  MileageEntry,
  SavedLocation,
  Budget,
  BudgetStatus,
  PaginatedResponse,
} from '@/types';

export const API_BASE = (import.meta.env.VITE_API_URL ?? '') + '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Auth token interceptor — set by ClerkProvider
let getToken: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(getter: () => Promise<string | null>) {
  getToken = getter;
}

api.interceptors.request.use(async (config) => {
  if (getToken) {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // Network error — let individual mutation onError handlers show the message
    } else if (error.response.status >= 500) {
      toast.error('Server error — please try again');
    }
    return Promise.reject(error);
  }
);

// ─── Projects ────────────────────────────────────────────────────

export const projectsApi = {
  list: (page = 1, limit = 50) =>
    api.get<PaginatedResponse<Project>>('/projects', { params: { page, limit } }).then((r) => r.data),

  get: (id: string) =>
    api.get<Project>(`/projects/${id}`).then((r) => r.data),

  create: (data: { name: string; description?: string; color?: string }) =>
    api.post<Project>('/projects', data).then((r) => r.data),

  update: (id: string, data: Partial<{ name: string; description: string; color: string; isActive: boolean }>) =>
    api.put<Project>(`/projects/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/projects/${id}`).then((r) => r.data),

  summary: (id: string) =>
    api.get(`/projects/${id}/summary`).then((r) => r.data),
};

// ─── Expenses ────────────────────────────────────────────────────

export const expensesApi = {
  list: (filters: ExpenseFilters = {}) =>
    api.get<PaginatedResponse<Expense>>('/expenses', { params: filters }).then((r) => r.data),

  get: (id: string) =>
    api.get<Expense>(`/expenses/${id}`).then((r) => r.data),

  create: (data: ExpenseFormData) =>
    api.post<Expense>('/expenses', data).then((r) => r.data),

  update: (id: string, data: Partial<ExpenseFormData & { reimbursementStatus: string }>) =>
    api.put<Expense>(`/expenses/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/expenses/${id}`).then((r) => r.data),

  bulkDelete: (ids: string[]) =>
    api.post('/expenses/bulk-delete', { ids }).then((r) => r.data),

  bulkCategorize: (ids: string[], categoryId: string) =>
    api.post('/expenses/bulk-categorize', { ids, categoryId }).then((r) => r.data),

  updateReimbursement: (id: string, data: { reimbursementStatus: string; reimbursedAmount?: number; reimbursedDate?: string }) =>
    api.patch(`/expenses/${id}/reimburse`, data).then((r) => r.data),

  /** Attach a pending receipt to an existing expense */
  attachReceipt: (expenseId: string, receiptId: string) =>
    api.post<Expense>(`/expenses/${expenseId}/receipts`, { receiptId }).then((r) => r.data),
};

// ─── Categories ──────────────────────────────────────────────────

export const categoriesApi = {
  list: () =>
    api.get<Category[]>('/categories').then((r) => r.data),

  create: (data: { name: string; icon?: string; color?: string; parentId?: string }) =>
    api.post<Category>('/categories', data).then((r) => r.data),

  update: (id: string, data: Partial<{ name: string; icon: string; color: string; sortOrder: number }>) =>
    api.put<Category>(`/categories/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/categories/${id}`).then((r) => r.data),

  listTax: () =>
    api.get<TaxCategory[]>('/categories/tax').then((r) => r.data),
};

// ─── Tags ────────────────────────────────────────────────────────

export const tagsApi = {
  list: () =>
    api.get<Tag[]>('/tags').then((r) => r.data),

  create: (data: { name: string; color?: string }) =>
    api.post<Tag>('/tags', data).then((r) => r.data),

  update: (id: string, data: Partial<{ name: string; color: string }>) =>
    api.put<Tag>(`/tags/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/tags/${id}`).then((r) => r.data),
};

// ─── Deposits ────────────────────────────────────────────────────

export const depositsApi = {
  list: (params: { projectId?: string; page?: number; limit?: number; dateFrom?: string; dateTo?: string } = {}) =>
    api.get<PaginatedResponse<Deposit>>('/deposits', { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<Deposit>(`/deposits/${id}`).then((r) => r.data),

  create: (data: { projectId: string; source: string; amount: number; date: string; description?: string; incomeCategory?: string; notes?: string }) =>
    api.post<Deposit>('/deposits', data).then((r) => r.data),

  update: (id: string, data: Partial<{ source: string; description: string; amount: number; date: string; projectId: string; notes: string }>) =>
    api.put<Deposit>(`/deposits/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/deposits/${id}`).then((r) => r.data),
};

// ─── Receipts ────────────────────────────────────────────────────

export const receiptsApi = {
  list: (params: { status?: string } = {}) =>
    api.get<Receipt[]>('/receipts', { params }).then((r) => r.data),

  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<Receipt>('/receipts/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  capture: (imageBase64: string, mimeType = 'image/jpeg') =>
    api.post<Receipt>('/receipts/capture', { image: imageBase64, mimeType }).then((r) => r.data),

  get: (id: string) =>
    api.get<Receipt>(`/receipts/${id}`).then((r) => r.data),

  getFileUrl: (id: string) => `${API_BASE}/receipts/${id}/file`,

  getPreviewUrl: (id: string) => `${API_BASE}/receipts/${id}/preview`,

  process: (id: string) =>
    api.post(`/receipts/${id}/process`).then((r) => r.data),

  getStatus: (id: string) =>
    api.get<Receipt>(`/receipts/${id}/status`).then((r) => r.data),

  accept: (id: string, data: ExpenseFormData) =>
    api.post<Expense>(`/receipts/${id}/accept`, data).then((r) => r.data),

  /** Create one expense with multiple receipts attached */
  acceptBatch: (data: { receiptIds: string[] } & Omit<ExpenseFormData, 'receiptId'>) =>
    api.post<Expense>('/receipts/accept-batch', data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/receipts/${id}`).then((r) => r.data),
};

// ─── Budgets ────────────────────────────────────────────────────

export const budgetsApi = {
  list: () =>
    api.get<Budget[]>('/budgets').then((r) => r.data),

  status: (params: { year?: number; month?: number } = {}) =>
    api.get<BudgetStatus[]>('/budgets/status', { params }).then((r) => r.data),

  create: (data: { projectId?: string; categoryId?: string; amount: number; period: string }) =>
    api.post<Budget>('/budgets', data).then((r) => r.data),

  update: (id: string, data: Partial<{ amount: number; period: string }>) =>
    api.put<Budget>(`/budgets/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/budgets/${id}`).then((r) => r.data),
};

// ─── Mileage ────────────────────────────────────────────────────

export const mileageApi = {
  list: (params: { year?: number; page?: number; limit?: number } = {}) =>
    api.get<PaginatedResponse<MileageEntry>>('/mileage', { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<MileageEntry>(`/mileage/${id}`).then((r) => r.data),

  create: (data: { date: string; startLocation: string; endLocation: string; distance: number; purpose: string; projectId: string; roundTrip?: boolean; taxDeductible?: boolean; reimbursable?: boolean; tagIds?: string[]; notes?: string }) =>
    api.post<MileageEntry>('/mileage', data).then((r) => r.data),

  update: (id: string, data: Partial<{ date: string; startLocation: string; endLocation: string; distance: number; purpose: string; projectId: string; roundTrip: boolean; taxDeductible: boolean; reimbursable: boolean; tagIds: string[]; notes: string }>) =>
    api.put<MileageEntry>(`/mileage/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/mileage/${id}`).then((r) => r.data),

  summary: (params: { year?: number } = {}) =>
    api.get('/mileage/summary', { params }).then((r) => r.data),
};

// ─── Saved Locations ─────────────────────────────────────────────

export const savedLocationsApi = {
  list: () => api.get<SavedLocation[]>('/saved-locations').then((r) => r.data),
  create: (data: { name: string; address: string }) =>
    api.post<SavedLocation>('/saved-locations', data).then((r) => r.data),
  delete: (id: string) => api.delete(`/saved-locations/${id}`).then((r) => r.data),
};

// ─── Reports ─────────────────────────────────────────────────────

export const reportsApi = {
  monthly: (params: { year?: number; month?: number; projectId?: string } = {}) =>
    api.get('/reports/monthly', { params }).then((r) => r.data),

  yearly: (params: { year?: number; projectId?: string } = {}) =>
    api.get('/reports/yearly', { params }).then((r) => r.data),

  tax: (params: { year?: number } = {}) =>
    api.get('/reports/tax', { params }).then((r) => r.data),

  reimbursement: (params: { status?: string } = {}) =>
    api.get('/reports/reimbursement', { params }).then((r) => r.data),

  categoryBreakdown: (params: { projectId?: string; dateFrom?: string; dateTo?: string } = {}) =>
    api.get('/reports/category-breakdown', { params }).then((r) => r.data),

  trend: (params: { months?: number; projectId?: string } = {}) =>
    api.get('/reports/trend', { params }).then((r) => r.data),

  exportCsv: async (params: { year?: number; month?: number; projectId?: string } = {}) => {
    const response = await api.get('/reports/export/csv', {
      params,
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const a = document.createElement('a');
    a.href = url;
    const disposition = response.headers['content-disposition'] || '';
    const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
    a.download = filenameMatch ? filenameMatch[1] : 'expenses.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  exportPdf: async (params: { year?: number; month?: number; projectId?: string } = {}) => {
    const response = await api.get('/reports/export/pdf', {
      params,
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    const disposition = response.headers['content-disposition'] || '';
    const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
    a.download = filenameMatch ? filenameMatch[1] : 'expense-report.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default api;
