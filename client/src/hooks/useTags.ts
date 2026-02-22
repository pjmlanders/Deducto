import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tagsApi } from '@/services/api';
import type { Tag } from '@/types';

export function useTags() {
  return useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color?: string }) => tagsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Tag added');
    },
    onError: () => toast.error('Failed to add tag'),
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tagsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Tag deleted');
    },
    onError: () => toast.error('Failed to delete tag'),
  });
}
