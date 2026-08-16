package dev.kstasks.epic;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EpicMemberRepository extends JpaRepository<EpicMember, UUID> {

    boolean existsByEpicIdAndUserId(UUID epicId, UUID userId);

    @EntityGraph(attributePaths = "user")
    List<EpicMember> findAllByEpicIdOrderByAddedAtAsc(UUID epicId);

    void deleteByEpicIdAndUserId(UUID epicId, UUID userId);
}
