package dev.kstasks.notify;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EpicNotifyConfigRepository extends JpaRepository<EpicNotifyConfig, UUID> {
    Optional<EpicNotifyConfig> findByEpicId(UUID epicId);

    List<EpicNotifyConfig> findAllByDailyReportEnabledTrue();

    List<EpicNotifyConfig> findAllByMergeNotifyEnabledTrue();
}
