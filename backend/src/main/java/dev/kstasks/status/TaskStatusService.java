package dev.kstasks.status;

import dev.kstasks.common.ApiException;
import dev.kstasks.status.dto.TaskStatusRequest;
import dev.kstasks.task.TaskRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class TaskStatusService {

    private final TaskStatusRepository statusRepository;
    private final TaskRepository taskRepository;

    public TaskStatusService(TaskStatusRepository statusRepository, TaskRepository taskRepository) {
        this.statusRepository = statusRepository;
        this.taskRepository = taskRepository;
    }

    public List<TaskStatus> list() {
        return statusRepository.findAllByOrderBySortOrderAsc();
    }

    @Transactional
    public TaskStatus create(TaskStatusRequest req) {
        if (statusRepository.existsByNameIgnoreCase(req.name())) {
            throw ApiException.conflict("DUPLICATE_STATUS_NAME", "A status named '" + req.name() + "' already exists");
        }
        TaskStatus status = new TaskStatus();
        status.setName(req.name().trim());
        status.setColor(req.color());
        status.setCategory(req.category());
        status.setSystem(false);
        int maxOrder = statusRepository.findAllByOrderBySortOrderAsc().stream()
                .mapToInt(TaskStatus::getSortOrder).max().orElse(-1);
        status.setSortOrder(maxOrder + 1);
        return statusRepository.save(status);
    }

    @Transactional
    public TaskStatus update(UUID id, TaskStatusRequest req) {
        TaskStatus status = getOrThrow(id);
        if (statusRepository.existsByNameIgnoreCaseAndIdNot(req.name(), id)) {
            throw ApiException.conflict("DUPLICATE_STATUS_NAME", "A status named '" + req.name() + "' already exists");
        }
        // renaming and recoloring is always allowed, even for system defaults
        status.setName(req.name().trim());
        status.setColor(req.color());
        status.setCategory(req.category());
        return statusRepository.save(status);
    }

    @Transactional
    public void delete(UUID id) {
        TaskStatus status = getOrThrow(id);
        long usageCount = taskRepository.countByStatusId(id);
        if (usageCount > 0) {
            throw ApiException.conflict("STATUS_IN_USE", "Cannot delete: " + usageCount + " task(s) still use this status");
        }
        if (statusRepository.findAllByOrderBySortOrderAsc().size() <= 1) {
            throw ApiException.badRequest("LAST_STATUS", "At least one status must remain");
        }
        statusRepository.delete(status);
    }

    @Transactional
    public void reorder(List<UUID> orderedIds) {
        var all = statusRepository.findAllByOrderBySortOrderAsc();
        var byId = all.stream().collect(java.util.stream.Collectors.toMap(TaskStatus::getId, s -> s));
        int order = 0;
        for (UUID id : orderedIds) {
            TaskStatus s = byId.get(id);
            if (s == null) continue;
            s.setSortOrder(order++);
            statusRepository.save(s);
        }
    }

    private TaskStatus getOrThrow(UUID id) {
        return statusRepository.findById(id).orElseThrow(() -> ApiException.notFound("Status not found"));
    }
}
