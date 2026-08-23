import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { UserRole, UserSummary } from '../types';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<UserSummary[]>('/users'),
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => api.patch<UserSummary>(`/users/${id}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useAdminResetPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      api.patch<void>(`/users/${id}/password`, { newPassword }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
