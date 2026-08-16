import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { TimelineConfig } from '../types';

export function useTimelineConfigs(epicId: string | undefined) {
  return useQuery({
    queryKey: ['timeline-configs', epicId],
    queryFn: () => api.get<TimelineConfig[]>(`/epics/${epicId}/timeline-configs`),
    enabled: !!epicId,
  });
}

export function useUpsertTimelineConfig(epicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, startDate, gapDays }: { userId: string; startDate: string; gapDays: string[] }) =>
      api.put<TimelineConfig>(`/epics/${epicId}/timeline-configs/${userId}`, { startDate, gapDays }),
    onMutate: async ({ userId, startDate, gapDays }) => {
      await qc.cancelQueries({ queryKey: ['timeline-configs', epicId] });
      const previous = qc.getQueryData<TimelineConfig[]>(['timeline-configs', epicId]);
      const next = previous ? [...previous] : [];
      const idx = next.findIndex((c) => c.userId === userId);
      const updated = { userId, startDate, gapDays };
      if (idx >= 0) next[idx] = updated;
      else next.push(updated);
      qc.setQueryData(['timeline-configs', epicId], next);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['timeline-configs', epicId], context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['timeline-configs', epicId] }),
  });
}
