package dev.kstasks.task;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface TaskLinkRepository extends JpaRepository<TaskLink, UUID> {
    boolean existsByBeTaskIdAndUiTaskId(UUID beTaskId, UUID uiTaskId);

    List<TaskLink> findAllByBeTaskId(UUID beTaskId);

    List<TaskLink> findAllByUiTaskId(UUID uiTaskId);

    void deleteByBeTaskIdAndUiTaskId(UUID beTaskId, UUID uiTaskId);

    @Query("select l from TaskLink l where l.beTask.epic.id = :epicId or l.uiTask.epic.id = :epicId")
    List<TaskLink> findAllByEpicId(@Param("epicId") UUID epicId);
}
