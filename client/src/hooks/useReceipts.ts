import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { receiptsApi } from '@/services/api';
import type { ExpenseFormData } from '@/types';

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
    mutationFn: (file: File) => receiptsApi.upload(file),
    onError: () => toast.error('Failed to upload receipt'),
  });
}

export function useCaptureReceipt() {
  return useMutation({
    mutationFn: ({ image, mimeType }: { image: string; mimeType?: string }) =>
      receiptsApi.capture(image, mimeType),
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
      queryClient.invalidateQueries({ queryKey: ['receipts', 'pending'] });
      toast.success('Receipt deleted');
    },
    onError: () => toast.error('Failed to delete receipt'),
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
      queryClient.invalidateQueries({ queryKey: ['receipts', 'pending'] });
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
      queryClient.invalidateQueries({ queryKey: ['receipts', 'pending'] });
      toast.success('Expense created with all receipts attached');
    },
    onError: () => toast.error('Failed to save expense'),
  });
}
