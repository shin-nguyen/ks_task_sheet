package dev.kstasks.task.dto;

import dev.kstasks.auth.dto.UserResponse;
import dev.kstasks.status.dto.TaskStatusResponse;
import dev.kstasks.task.Task;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TaskResponse(
        UUID id,
        UUID epicId,
        String ticketId,
        String title,
        String description,
        Task.Type type,
        String note,
        UserResponse beAssignee,
        UserResponse uiAssignee,
        UserResponse testAssignee,
        BigDecimal devEffort,
        BigDecimal testEffort,
        BigDecimal totalEffort,
        List<LinkedTaskSummary> linkedTasks,
        TaskStatusResponse status,
        int sortOrder,
        Instant createdAt,
        Instant updatedAt
) {
    public record LinkedTaskSummary(UUID id, String ticketId, Task.Type type) {
    }

    public static TaskResponse from(Task t, List<Task> linkedPartners) {
        return new TaskResponse(
                t.getId(),
                t.getEpic().getId(),
                t.getTicketId(),
                t.getTitle(),
                t.getDescription(),
                t.getType(),
                t.getNote(),
                t.getBeAssignee() != null ? UserResponse.from(t.getBeAssignee()) : null,
                t.getUiAssignee() != null ? UserResponse.from(t.getUiAssignee()) : null,
                t.getTestAssignee() != null ? UserResponse.from(t.getTestAssignee()) : null,
                t.getDevEffort(),
                t.getTestEffort(),
                t.getTotalEffort(),
                linkedPartners.stream()
                        .map(p -> new LinkedTaskSummary(p.getId(), p.getTicketId(), p.getType()))
                        .toList(),
                TaskStatusResponse.from(t.getStatus()),
                t.getSortOrder(),
                t.getCreatedAt(),
                t.getUpdatedAt()
        );
    }
}
