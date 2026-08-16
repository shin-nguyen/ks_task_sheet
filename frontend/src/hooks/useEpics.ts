import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Epic } from '../types';

export interface EpicInput {
  ticketId: string;
  name: string;
}

export function useEpics() {
  return useQuery({
    queryKey: ['epics'],
    queryFn: () => api.get<Epic[]>('/epics'),
  });
}

export function useEpic(id: string | undefined) {
  return useQuery({
    queryKey: ['epics', id],
    queryFn: () => api.get<Epic>(`/epics/${id}`),
    enabled: !!id,
  });
}

export function useCreateEpic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EpicInput) => api.post<Epic>('/epics', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['epics'] }),
  });
}

export function useUpdateEpic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EpicInput }) => api.put<Epic>(`/epics/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['epics'] }),
  });
}

export function useDeleteEpic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/epics/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['epics'] }),
  });
}
