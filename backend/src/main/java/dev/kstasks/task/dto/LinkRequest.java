package dev.kstasks.task.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record LinkRequest(@NotNull UUID targetTaskId) {
}
