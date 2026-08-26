package dev.kstasks.epic.dto;

import dev.kstasks.epic.Epic;

import java.time.Instant;
import java.util.UUID;

public record EpicResponse(
        UUID id,
        String ticketId,
        String name,
        String createdByName,
        Instant createdAt,
        long taskCount,
        boolean isMember
) {
    public static EpicResponse from(Epic e, long taskCount, boolean isMember) {
        return new EpicResponse(
                e.getId(),
                e.getTicketId(),
                e.getName(),
                e.getCreatedBy() != null ? e.getCreatedBy().getName() : null,
                e.getCreatedAt(),
                taskCount,
                isMember
        );
    }
}
