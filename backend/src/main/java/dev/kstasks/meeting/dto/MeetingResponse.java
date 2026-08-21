package dev.kstasks.meeting.dto;

import dev.kstasks.auth.dto.UserResponse;
import dev.kstasks.meeting.EpicMeeting;

import java.time.Instant;
import java.util.UUID;

public record MeetingResponse(
        UUID id,
        String title,
        Instant scheduledAt,
        String link,
        String agenda,
        String minutes,
        UserResponse createdBy,
        Instant createdAt,
        Instant updatedAt
) {
    public static MeetingResponse from(EpicMeeting m) {
        return new MeetingResponse(
                m.getId(),
                m.getTitle(),
                m.getScheduledAt(),
                m.getLink(),
                m.getAgenda(),
                m.getMinutes(),
                UserResponse.from(m.getCreatedBy()),
                m.getCreatedAt(),
                m.getUpdatedAt()
        );
    }
}
