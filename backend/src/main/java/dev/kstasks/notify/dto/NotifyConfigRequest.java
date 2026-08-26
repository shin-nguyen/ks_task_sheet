package dev.kstasks.notify.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;

public record NotifyConfigRequest(
        String roomName,
        boolean meetingReminderEnabled,
        boolean dailyReportEnabled,
        @NotNull LocalTime dailyReportTime,
        boolean mergeNotifyEnabled,
        String gitRepoUrl,
        String gitBranch,
        @Min(1) int gitPollIntervalMinutes
) {
}
