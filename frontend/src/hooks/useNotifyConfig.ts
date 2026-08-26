import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { NotifyConfig, NotifyConfigInput } from '../types';

export function useNotifyConfig(epicId: string | undefined) {
  return useQuery({
    queryKey: ['notify-config', epicId],
    queryFn: () => api.get<NotifyConfig>(`/epics/${epicId}/notify-config`),
    enabled: !!epicId,
  });
}

export function useSaveNotifyConfig(epicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NotifyConfigInput) => api.put<NotifyConfig>(`/epics/${epicId}/notify-config`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notify-config', epicId] }),
  });
}

export function useReresolveRoom(epicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<NotifyConfig>(`/epics/${epicId}/notify-config/reresolve-room`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notify-config', epicId] }),
  });
}
