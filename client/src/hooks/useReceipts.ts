import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { receiptsApi } from '@/services/api';
import type { ExpenseFormData } from '@/types';

export function useReceiptIssueCount() {
  return useQuery({
    queryKey: ['receipts', 'issues-count'],
    queryFn: () => receiptsApi.issuesCount(),
    refetchInterval: 30_000,
  });
}

export function usePendingReceipts() {
  return useQuery({
    queryKey: ['receipts', 'pending'],
    queryFn: () => receiptsApi.list({ status: 'pending' }),
    refetchInterval: (query) => {
      const receipts = query.state.data;
      const hasInFlight = receipts?.some(
        (r) => r.processingStatus === 'processing' || r.processingStatus === 'pending'
      );
      return hasInFlight ? 3000 : false;
    },
  });
}

export function useUploadReceipt() {
  return useMutation({
    mutationFn: ({ file, projectId }: { file: File; projectId?: string }) =>
      receiptsApi.upload(file, projectId),
    onError: () => toast.error('Failed to upload receipt'),
  });
}

export function useCaptureReceipt() {
  return useMutation({
    mutationFn: ({ image, mimeType, projectId }: { image: string; mimeType?: string; projectId?: string }) =>
      receiptsApi.capture(image, mimeType, projectId),
    onError: () => toast.error('Failed to capture receipt'),
  });
}

export function useProcessReceipt() {
  return useMutation({
    mutationFn: (receiptId: string) => receiptsApi.process(receiptId),
    onError: () => toast.error('Receipt processing failed'),
  });
}

export function useReceiptStatus(receiptId: string | null) {
  return useQuery({
    queryKey: ['receipt-status', receiptId],
    queryFn: () => receiptsApi.getStatus(receiptId!),
    enabled: !!receiptId,
    refetchInterval: (query) =>
      query.state.data?.processingStatus === 'processing' ? 2000 : false,
  });
}

export function useDeleteReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: receiptsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast.success('Receipt deleted');
    },
    onError: () => toast.error('Failed to delete receipt'),
  });
}

export function useDeleteAllReceipts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: receiptsApi.deleteAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast.success('All pending receipts deleted');
    },
    onError: () => toast.error('Failed to delete receipts'),
  });
}

export function useAcceptReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ receiptId, ...data }: { receiptId: string } & ExpenseFormData) =>
      receiptsApi.accept(receiptId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast.success('Expense saved from receipt');
    },
    onError: () => toast.error('Failed to save expense'),
  });
}

export function useAcceptBatchReceipts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { receiptIds: string[] } & Omit<ExpenseFormData, 'receiptId'>) =>
      receiptsApi.acceptBatch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['receipts', 'pending'] });
      toast.success('Expense created with all receipts attached');
    },
    onError: () => toast.error('Failed to save expense'),
  });
}
