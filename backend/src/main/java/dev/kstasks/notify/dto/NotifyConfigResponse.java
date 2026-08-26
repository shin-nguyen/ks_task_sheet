package dev.kstasks.notify.dto;

import dev.kstasks.notify.EpicNotifyConfig;
import dev.kstasks.notify.EpicNotifyState;

import java.time.Instant;
import java.time.LocalTime;

public record NotifyConfigResponse(
        boolean configured,
        String roomName,
        String roomId,
        Instant roomResolvedAt,
        boolean meetingReminderEnabled,
        boolean dailyReportEnabled,
        LocalTime dailyReportTime,
        boolean mergeNotifyEnabled,
        String gitRepoUrl,
        String gitBranch,
        int gitPollIntervalMinutes,
        String gitCloneStatus,
        String gitLastError
) {
    public static NotifyConfigResponse unconfigured() {
        return new NotifyConfigResponse(false, "", null, null, false, false, LocalTime.of(9, 0), false, null, null, 15, null, null);
    }

    public static NotifyConfigResponse from(EpicNotifyConfig config, EpicNotifyState state) {
        return new NotifyConfigResponse(
                true,
                config.getRoomName(),
                config.getRoomId(),
                config.getRoomResolvedAt(),
                config.isMeetingReminderEnabled(),
                config.isDailyReportEnabled(),
                config.getDailyReportTime(),
                config.isMergeNotifyEnabled(),
                config.getGitRepoUrl(),
                config.getGitBranch(),
                config.getGitPollIntervalMinutes(),
                state != null ? state.getGitCloneStatus().name() : null,
                state != null ? state.getGitLastError() : null
        );
    }
}
