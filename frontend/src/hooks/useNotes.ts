import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { EpicNote } from '../types';

export function useNotes(epicId: string | undefined) {
  return useQuery({
    queryKey: ['notes', epicId],
    queryFn: () => api.get<EpicNote[]>(`/epics/${epicId}/notes`),
    enabled: !!epicId,
  });
}

export function useCreateNote(epicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => api.post<EpicNote>(`/epics/${epicId}/notes`, { content }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes', epicId] }),
  });
}

export function useUpdateNote(epicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => api.put<EpicNote>(`/notes/${id}`, { content }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes', epicId] }),
  });
}

export function useDeleteNote(epicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/notes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes', epicId] }),
  });
}
