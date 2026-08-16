import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Task, TaskWriteInput } from '../types';

export function tasksKey(epicId: string) {
  return ['tasks', epicId];
}

export function useTasks(epicId: string | undefined) {
  return useQuery({
    queryKey: tasksKey(epicId ?? ''),
    queryFn: () => api.get<Task[]>(`/epics/${epicId}/tasks`),
    enabled: !!epicId,
  });
}

export function useCreateTask(epicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskWriteInput) => api.post<Task>(`/epics/${epicId}/tasks`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: tasksKey(epicId) }),
  });
}

export function useUpdateTask(epicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TaskWriteInput }) => api.put<Task>(`/tasks/${id}`, input),
    onMutate: async ({ id, input }) => {
      await qc.cancelQueries({ queryKey: tasksKey(epicId) });
      const previous = qc.getQueryData<Task[]>(tasksKey(epicId));
      if (previous) {
        qc.setQueryData<Task[]>(
          tasksKey(epicId),
          previous.map((t): Task =>
            t.id === id
              ? {
                  ...t,
                  ticketId: input.ticketId,
                  title: input.title,
                  description: input.description,
                  type: input.type,
                  note: input.note,
                  devEffort: input.devEffort,
                  testEffort: input.testEffort,
                  totalEffort: input.devEffort + input.testEffort,
                  beAssignee: input.beAssigneeId
                    ? previous.find((x) => x.beAssignee?.id === input.beAssigneeId)?.beAssignee ?? t.beAssignee
                    : null,
                  uiAssignee: input.uiAssigneeId
                    ? previous.find((x) => x.uiAssignee?.id === input.uiAssigneeId)?.uiAssignee ?? t.uiAssignee
                    : null,
                  testAssignee: input.testAssigneeId
                    ? previous.find((x) => x.testAssignee?.id === input.testAssigneeId)?.testAssignee ?? t.testAssignee
                    : null,
                  // status is resolved from `statuses` server-side; onSettled refetch reconciles it
                }
              : t
          )
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(tasksKey(epicId), context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: tasksKey(epicId) }),
  });
}

export function useDeleteTask(epicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/tasks/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: tasksKey(epicId) });
      const previous = qc.getQueryData<Task[]>(tasksKey(epicId));
      if (previous) {
        qc.setQueryData<Task[]>(tasksKey(epicId), previous.filter((t) => t.id !== id));
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(tasksKey(epicId), context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: tasksKey(epicId) }),
  });
}

export function useLinkTask(epicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, targetTaskId }: { id: string; targetTaskId: string }) =>
      api.post<Task>(`/tasks/${id}/link`, { targetTaskId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: tasksKey(epicId) }),
  });
}

export function useUnlinkTask(epicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, targetTaskId }: { id: string; targetTaskId: string }) =>
      api.delete<void>(`/tasks/${id}/link/${targetTaskId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: tasksKey(epicId) }),
  });
}

export function useReorderTasks(epicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) => api.patch<void>(`/epics/${epicId}/tasks/reorder`, { orderedIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: tasksKey(epicId) }),
  });
}
