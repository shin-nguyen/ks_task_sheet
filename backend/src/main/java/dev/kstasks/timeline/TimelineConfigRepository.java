package dev.kstasks.timeline;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TimelineConfigRepository extends JpaRepository<TimelineConfig, UUID> {
    List<TimelineConfig> findAllByEpicId(UUID epicId);

    Optional<TimelineConfig> findByEpicIdAndUserId(UUID epicId, UUID userId);
}
