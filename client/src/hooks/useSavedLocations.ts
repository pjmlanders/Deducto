import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { savedLocationsApi } from '@/services/api';
import { toast } from 'sonner';

export function useSavedLocations() {
  return useQuery({
    queryKey: ['saved-locations'],
    queryFn: savedLocationsApi.list,
  });
}

export function useCreateSavedLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: savedLocationsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-locations'] });
      toast.success('Location saved');
    },
    onError: () => toast.error('Failed to save location'),
  });
}

export function useDeleteSavedLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: savedLocationsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-locations'] });
      toast.success('Location removed');
    },
    onError: () => toast.error('Failed to remove location'),
  });
}
