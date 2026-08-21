package dev.kstasks.berequest;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BeTicketRequestRepository extends JpaRepository<BeTicketRequest, UUID> {
    List<BeTicketRequest> findAllByEpicIdOrderByCreatedAtDesc(UUID epicId);
}
