package dev.kstasks.document;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EpicDocumentRepository extends JpaRepository<EpicDocument, UUID> {
    List<EpicDocument> findAllByEpicIdOrderByCreatedAtDesc(UUID epicId);
}
