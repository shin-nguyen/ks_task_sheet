import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { EpicTodo } from '../types';

export interface TodoInput {
  title: string;
  assigneeId: string | null;
  dueDate: string | null;
  done: boolean;
}

export function useTodos(epicId: string | undefined) {
  return useQuery({
    queryKey: ['todos', epicId],
    queryFn: () => api.get<EpicTodo[]>(`/epics/${epicId}/todos`),
    enabled: !!epicId,
  });
}

export function useCreateTodo(epicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TodoInput) => api.post<EpicTodo>(`/epics/${epicId}/todos`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos', epicId] }),
  });
}

export function useUpdateTodo(epicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TodoInput }) => api.put<EpicTodo>(`/todos/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos', epicId] }),
  });
}

export function useDeleteTodo(epicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/todos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos', epicId] }),
  });
}
