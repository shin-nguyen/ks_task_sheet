package dev.kstasks.epic.dto;

import dev.kstasks.epic.EpicMember;

import java.time.Instant;
import java.util.UUID;

public record EpicMemberResponse(UUID userId, String name, String email, Instant addedAt) {
    public static EpicMemberResponse from(EpicMember m) {
        return new EpicMemberResponse(m.getUser().getId(), m.getUser().getName(), m.getUser().getEmail(), m.getAddedAt());
    }
}
