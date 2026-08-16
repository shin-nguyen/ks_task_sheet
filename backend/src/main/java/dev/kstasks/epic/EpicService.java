package dev.kstasks.epic;

import dev.kstasks.auth.User;
import dev.kstasks.common.ApiException;
import dev.kstasks.epic.dto.EpicRequest;
import dev.kstasks.task.TaskRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class EpicService {

    private final EpicRepository epicRepository;
    private final TaskRepository taskRepository;
    private final EpicMemberRepository epicMemberRepository;

    public EpicService(EpicRepository epicRepository, TaskRepository taskRepository, EpicMemberRepository epicMemberRepository) {
        this.epicRepository = epicRepository;
        this.taskRepository = taskRepository;
        this.epicMemberRepository = epicMemberRepository;
    }

    public List<Epic> list(User currentUser) {
        if (currentUser.getRole() == User.Role.ADMIN) {
            return epicRepository.findAllByOrderByCreatedAtDesc();
        }
        return epicRepository.findAllForUser(currentUser.getId());
    }

    public Epic getOrThrow(UUID id) {
        return epicRepository.findById(id).orElseThrow(() -> ApiException.notFound("Epic not found"));
    }

    public long taskCount(UUID epicId) {
        return taskRepository.countByEpicId(epicId);
    }

    @Transactional
    public Epic create(EpicRequest req, User creator) {
        Epic epic = new Epic();
        epic.setTicketId(req.ticketId().trim());
        epic.setName(req.name().trim());
        epic.setCreatedBy(creator);
        epic = epicRepository.save(epic);

        EpicMember member = new EpicMember();
        member.setEpic(epic);
        member.setUser(creator);
        epicMemberRepository.save(member);

        return epic;
    }

    @Transactional
    public Epic update(UUID id, EpicRequest req) {
        Epic epic = getOrThrow(id);
        epic.setTicketId(req.ticketId().trim());
        epic.setName(req.name().trim());
        return epicRepository.save(epic);
    }

    @Transactional
    public void delete(UUID id) {
        Epic epic = getOrThrow(id);
        epicRepository.delete(epic);
    }
}
