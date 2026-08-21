package dev.kstasks.berequest.dto;

import dev.kstasks.auth.dto.UserResponse;
import dev.kstasks.berequest.BeTicketRequest;

import java.time.Instant;
import java.util.UUID;

public record BeTicketRequestResponse(
        UUID id,
        TaskSummary uiTask,
        String note,
        boolean resolved,
        UserResponse createdBy,
        Instant createdAt,
        Instant resolvedAt
) {
    public record TaskSummary(UUID id, String ticketId, String title) {
    }

    public static BeTicketRequestResponse from(BeTicketRequest r) {
        var task = r.getUiTask();
        return new BeTicketRequestResponse(
                r.getId(),
                new TaskSummary(task.getId(), task.getTicketId(), task.getTitle()),
                r.getNote(),
                r.isResolved(),
                UserResponse.from(r.getCreatedBy()),
                r.getCreatedAt(),
                r.getResolvedAt()
        );
    }
}
