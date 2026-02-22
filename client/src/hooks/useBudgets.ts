import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { budgetsApi } from '@/services/api';
import type { BudgetStatus } from '@/types';

export function useBudgets() {
  return useQuery({
    queryKey: ['budgets'],
    queryFn: budgetsApi.list,
  });
}

export function useBudgetStatus(year?: number, month?: number) {
  return useQuery<BudgetStatus[]>({
    queryKey: ['budgets', 'status', year, month],
    queryFn: () => budgetsApi.status({ year, month }),
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: budgetsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Budget saved');
    },
    onError: () => toast.error('Failed to save budget'),
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: budgetsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Budget deleted');
    },
    onError: () => toast.error('Failed to delete budget'),
  });
}
