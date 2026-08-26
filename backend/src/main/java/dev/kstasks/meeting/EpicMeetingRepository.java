package dev.kstasks.meeting;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface EpicMeetingRepository extends JpaRepository<EpicMeeting, UUID> {
    List<EpicMeeting> findAllByEpicIdOrderByScheduledAtAsc(UUID epicId);

    List<EpicMeeting> findAllByReminderSentAtIsNullAndScheduledAtBetween(Instant start, Instant end);
}
