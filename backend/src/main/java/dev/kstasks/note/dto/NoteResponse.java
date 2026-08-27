package dev.kstasks.note.dto;

import dev.kstasks.auth.dto.UserResponse;
import dev.kstasks.note.EpicNote;

import java.time.Instant;
import java.util.UUID;

public record NoteResponse(UUID id, String content, UserResponse author, UserResponse updatedBy, Instant createdAt, Instant updatedAt) {
    public static NoteResponse from(EpicNote n) {
        return new NoteResponse(n.getId(), n.getContent(), UserResponse.from(n.getAuthor()), UserResponse.from(n.getUpdatedBy()), n.getCreatedAt(), n.getUpdatedAt());
    }
}
