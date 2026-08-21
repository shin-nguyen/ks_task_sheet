import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { EpicDocument } from '../types';

export function useDocuments(epicId: string | undefined) {
  return useQuery({
    queryKey: ['documents', epicId],
    queryFn: () => api.get<EpicDocument[]>(`/epics/${epicId}/documents`),
    enabled: !!epicId,
  });
}

export function useUploadDocument(epicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, displayName }: { file: File; displayName?: string }) => {
      const form = new FormData();
      form.append('file', file);
      if (displayName) form.append('displayName', displayName);
      return api.postForm<EpicDocument>(`/epics/${epicId}/documents`, form);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents', epicId] }),
  });
}

export function useRenameDocument(epicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, displayName }: { id: string; displayName: string }) =>
      api.patch<EpicDocument>(`/documents/${id}`, { displayName }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents', epicId] }),
  });
}

export function useDeleteDocument(epicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/documents/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents', epicId] }),
  });
}

export async function downloadDocument(doc: EpicDocument) {
  const blob = await api.getBlob(`/documents/${doc.id}/download`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = doc.displayName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
