import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { EpicMeeting } from '../types';

export interface MeetingInput {
  title: string;
  scheduledAt: string;
  link: string | null;
  agenda: string | null;
  minutes: string | null;
}

export function useMeetings(epicId: string | undefined) {
  return useQuery({
    queryKey: ['meetings', epicId],
    queryFn: () => api.get<EpicMeeting[]>(`/epics/${epicId}/meetings`),
    enabled: !!epicId,
  });
}

export function useCreateMeeting(epicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MeetingInput) => api.post<EpicMeeting>(`/epics/${epicId}/meetings`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meetings', epicId] }),
  });
}

export function useUpdateMeeting(epicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MeetingInput }) => api.put<EpicMeeting>(`/meetings/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meetings', epicId] }),
  });
}

export function useDeleteMeeting(epicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/meetings/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meetings', epicId] }),
  });
}
