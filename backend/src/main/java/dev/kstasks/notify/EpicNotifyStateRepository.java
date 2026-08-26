package dev.kstasks.notify;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface EpicNotifyStateRepository extends JpaRepository<EpicNotifyState, UUID> {
}
