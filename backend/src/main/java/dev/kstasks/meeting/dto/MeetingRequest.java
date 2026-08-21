package dev.kstasks.meeting.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record MeetingRequest(@NotBlank String title, @NotNull Instant scheduledAt, String link, String agenda, String minutes) {
}
