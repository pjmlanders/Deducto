import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { depositsApi } from '@/services/api';

export function useDeposits(params: { projectId?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ['deposits', params],
    queryFn: () => depositsApi.list(params),
  });
}

export function useCreateDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: depositsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Deposit added');
    },
    onError: () => toast.error('Failed to add deposit'),
  });
}

export function useUpdateDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Parameters<typeof depositsApi.update>[1]) =>
      depositsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Deposit updated');
    },
    onError: () => toast.error('Failed to update deposit'),
  });
}

export function useDeleteDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: depositsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Deposit deleted');
    },
    onError: () => toast.error('Failed to delete deposit'),
  });
}
