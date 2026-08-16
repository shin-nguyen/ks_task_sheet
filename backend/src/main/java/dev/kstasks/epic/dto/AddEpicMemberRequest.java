package dev.kstasks.epic.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AddEpicMemberRequest(@NotNull UUID userId) {
}
