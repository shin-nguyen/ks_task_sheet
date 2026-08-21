package dev.kstasks.document.dto;

import dev.kstasks.auth.dto.UserResponse;
import dev.kstasks.document.EpicDocument;

import java.time.Instant;
import java.util.UUID;

public record DocumentResponse(UUID id, String displayName, String originalFilename, String contentType,
                                long sizeBytes, UserResponse uploadedBy, Instant createdAt, Instant updatedAt) {
    public static DocumentResponse from(EpicDocument d) {
        return new DocumentResponse(d.getId(), d.getDisplayName(), d.getOriginalFilename(), d.getContentType(),
                d.getSizeBytes(), UserResponse.from(d.getUploadedBy()), d.getCreatedAt(), d.getUpdatedAt());
    }
}
