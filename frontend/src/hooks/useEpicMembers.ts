import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { EpicMember } from '../types';

export function useEpicMembers(epicId: string | undefined) {
  return useQuery({
    queryKey: ['epics', epicId, 'members'],
    queryFn: () => api.get<EpicMember[]>(`/epics/${epicId}/members`),
    enabled: !!epicId,
  });
}

export function useAddEpicMember(epicId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.post<EpicMember>(`/epics/${epicId}/members`, { userId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['epics', epicId, 'members'] }),
  });
}

export function useRemoveEpicMember(epicId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.delete<void>(`/epics/${epicId}/members/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['epics', epicId, 'members'] }),
  });
}
