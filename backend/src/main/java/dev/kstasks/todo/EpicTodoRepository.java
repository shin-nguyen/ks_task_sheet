package dev.kstasks.todo;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EpicTodoRepository extends JpaRepository<EpicTodo, UUID> {
    List<EpicTodo> findAllByEpicIdOrderByCreatedAtAsc(UUID epicId);
}
