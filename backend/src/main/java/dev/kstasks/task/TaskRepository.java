package dev.kstasks.task;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {
    List<Task> findAllByEpicIdOrderBySortOrderAsc(UUID epicId);

    long countByEpicId(UUID epicId);

    long countByStatusId(UUID statusId);

    boolean existsByEpicIdAndTicketIdIgnoreCase(UUID epicId, String ticketId);

    boolean existsByEpicIdAndTicketIdIgnoreCaseAndIdNot(UUID epicId, String ticketId, UUID id);
}
