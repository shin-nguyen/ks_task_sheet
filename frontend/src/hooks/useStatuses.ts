import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { TaskStatus } from '../types';

export interface StatusInput {
  name: string;
  color: string;
  category: 'ACTIVE' | 'DONE';
}

export function useStatuses() {
  return useQuery({
    queryKey: ['statuses'],
    queryFn: () => api.get<TaskStatus[]>('/statuses'),
    staleTime: 60_000,
  });
}

export function useCreateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StatusInput) => api.post<TaskStatus>('/statuses', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['statuses'] }),
  });
}

export function useUpdateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: StatusInput }) => api.put<TaskStatus>(`/statuses/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['statuses'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/statuses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['statuses'] }),
  });
}

export function useReorderStatuses() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) => api.patch<void>('/statuses/reorder', { orderedIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['statuses'] }),
  });
}
