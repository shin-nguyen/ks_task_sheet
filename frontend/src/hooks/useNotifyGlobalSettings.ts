import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { NotifyGlobalSettings } from '../types';

export function useNotifyGlobalSettings() {
  return useQuery({
    queryKey: ['notify-global-settings'],
    queryFn: () => api.get<NotifyGlobalSettings>('/notify/global-settings'),
  });
}

export function useSaveNotifyGlobalSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => api.put<NotifyGlobalSettings>('/notify/global-settings', { enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notify-global-settings'] }),
  });
}
