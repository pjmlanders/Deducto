import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { expensesApi } from '@/services/api';
import type { ExpenseFilters, ExpenseFormData } from '@/types';

export function useExpenses(filters: ExpenseFilters = {}) {
  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: () => expensesApi.list(filters),
    placeholderData: (prev) => prev,
  });
}

export function useExpense(id: string | undefined) {
  return useQuery({
    queryKey: ['expenses', id],
    queryFn: () => expensesApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ExpenseFormData) => expensesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Expense added');
    },
    onError: () => toast.error('Failed to add expense'),
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<ExpenseFormData>) =>
      expensesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Expense updated');
    },
    onError: () => toast.error('Failed to update expense'),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: expensesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Expense deleted');
    },
    onError: () => toast.error('Failed to delete expense'),
  });
}

export function useUpdateReimbursement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; reimbursementStatus: string; reimbursedAmount?: number; reimbursedDate?: string }) =>
      expensesApi.updateReimbursement(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Reimbursement updated');
    },
    onError: () => toast.error('Failed to update reimbursement'),
  });
}

export function useBulkCategorize() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, categoryId }: { ids: string[]; categoryId: string }) =>
      expensesApi.bulkCategorize(ids, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Category applied');
    },
    onError: () => toast.error('Failed to categorize expenses'),
  });
}

export function useBulkDeleteExpenses() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => expensesApi.bulkDelete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Expenses deleted');
    },
    onError: () => toast.error('Failed to delete expenses'),
  });
}
