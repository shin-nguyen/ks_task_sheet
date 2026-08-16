package dev.kstasks.status.dto;

import dev.kstasks.status.TaskStatus;

import java.util.UUID;

public record TaskStatusResponse(
        UUID id,
        String name,
        String color,
        TaskStatus.Category category,
        int sortOrder,
        boolean system
) {
    public static TaskStatusResponse from(TaskStatus s) {
        return new TaskStatusResponse(s.getId(), s.getName(), s.getColor(), s.getCategory(), s.getSortOrder(), s.isSystem());
    }
}
