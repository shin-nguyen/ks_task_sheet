package dev.kstasks.epic;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface EpicRepository extends JpaRepository<Epic, UUID> {
    List<Epic> findAllByOrderByCreatedAtDesc();

    @Query("SELECT DISTINCT m.epic FROM EpicMember m WHERE m.user.id = :userId ORDER BY m.epic.createdAt DESC")
    List<Epic> findAllForUser(@Param("userId") UUID userId);
}
