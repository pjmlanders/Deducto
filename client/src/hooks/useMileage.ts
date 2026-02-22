import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { mileageApi } from '@/services/api';

export function useMileage(year?: number) {
  return useQuery({
    queryKey: ['mileage', year],
    queryFn: () => mileageApi.list({ year, limit: 100 }),
  });
}

export function useMileageSummary(year?: number) {
  return useQuery({
    queryKey: ['mileage', 'summary', year],
    queryFn: () => mileageApi.summary({ year }),
  });
}

export function useCreateMileage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mileageApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mileage'] });
      toast.success('Trip logged');
    },
    onError: () => toast.error('Failed to log trip'),
  });
}

export function useDeleteMileage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mileageApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mileage'] });
      toast.success('Trip deleted');
    },
    onError: () => toast.error('Failed to delete trip'),
  });
}
