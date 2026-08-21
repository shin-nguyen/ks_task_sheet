import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { BeTicketRequest } from '../types';

export function useBeRequests(epicId: string | undefined) {
  return useQuery({
    queryKey: ['be-requests', epicId],
    queryFn: () => api.get<BeTicketRequest[]>(`/epics/${epicId}/be-requests`),
    enabled: !!epicId,
  });
}

export function useCreateBeRequest(epicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { uiTaskId: string; note: string; apiDesign: string | null }) =>
      api.post<BeTicketRequest>(`/epics/${epicId}/be-requests`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['be-requests', epicId] }),
  });
}

export function useUpdateBeRequest(epicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note, apiDesign, resolved }: { id: string; note: string; apiDesign: string | null; resolved: boolean }) =>
      api.put<BeTicketRequest>(`/be-requests/${id}`, { note, apiDesign, resolved }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['be-requests', epicId] }),
  });
}

export function useDeleteBeRequest(epicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/be-requests/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['be-requests', epicId] }),
  });
}
