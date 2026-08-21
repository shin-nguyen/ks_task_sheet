package dev.kstasks.meeting;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EpicMeetingRepository extends JpaRepository<EpicMeeting, UUID> {
    List<EpicMeeting> findAllByEpicIdOrderByScheduledAtAsc(UUID epicId);
}
