package dev.kstasks.task.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;
import java.util.UUID;

public record ReorderTasksRequest(@NotEmpty List<UUID> orderedIds) {
}
