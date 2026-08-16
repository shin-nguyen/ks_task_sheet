package dev.kstasks.note;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EpicNoteRepository extends JpaRepository<EpicNote, UUID> {
    List<EpicNote> findAllByEpicIdOrderByCreatedAtDesc(UUID epicId);
}
