package dev.kstasks.task;

import dev.kstasks.auth.User;
import dev.kstasks.auth.UserRepository;
import dev.kstasks.common.ApiException;
import dev.kstasks.epic.Epic;
import dev.kstasks.epic.EpicAccessService;
import dev.kstasks.epic.EpicRepository;
import dev.kstasks.status.TaskStatus;
import dev.kstasks.status.TaskStatusRepository;
import dev.kstasks.task.dto.TaskRequest;
import dev.kstasks.task.dto.TaskResponse;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final EpicRepository epicRepository;
    private final UserRepository userRepository;
    private final TaskStatusRepository statusRepository;
    private final TaskLinkRepository taskLinkRepository;
    private final EpicAccessService epicAccessService;

    public TaskService(TaskRepository taskRepository, EpicRepository epicRepository,
                        UserRepository userRepository, TaskStatusRepository statusRepository,
                        TaskLinkRepository taskLinkRepository, EpicAccessService epicAccessService) {
        this.taskRepository = taskRepository;
        this.epicRepository = epicRepository;
        this.userRepository = userRepository;
        this.statusRepository = statusRepository;
        this.taskLinkRepository = taskLinkRepository;
        this.epicAccessService = epicAccessService;
    }

    @Transactional
    public List<Task> listByEpic(UUID epicId) {
        epicAccessService.assertAccess(epicId);
        getEpicOrThrow(epicId);
        return taskRepository.findAllByEpicIdOrderBySortOrderAsc(epicId);
    }

    @Transactional
    public Task create(UUID epicId, TaskRequest req) {
        epicAccessService.assertAccess(epicId);
        Epic epic = getEpicOrThrow(epicId);
        if (taskRepository.existsByEpicIdAndTicketIdIgnoreCase(epicId, req.ticketId())) {
            throw ApiException.conflict("DUPLICATE_TICKET_ID", "A task with ticket ID '" + req.ticketId() + "' already exists in this epic");
        }
        Task task = new Task();
        task.setEpic(epic);
        applyFields(task, req, epicId, null);

        long count = taskRepository.countByEpicId(epicId);
        task.setSortOrder((int) count);
        return taskRepository.save(task);
    }

    @Transactional
    public Task update(UUID taskId, TaskRequest req) {
        Task task = getTaskOrThrow(taskId);
        epicAccessService.assertAccess(task.getEpic().getId());
        if (taskRepository.existsByEpicIdAndTicketIdIgnoreCaseAndIdNot(task.getEpic().getId(), req.ticketId(), taskId)) {
            throw ApiException.conflict("DUPLICATE_TICKET_ID", "A task with ticket ID '" + req.ticketId() + "' already exists in this epic");
        }
        applyFields(task, req, task.getEpic().getId(), taskId);
        return taskRepository.save(task);
    }

    private void applyFields(Task task, TaskRequest req, UUID epicId, UUID selfId) {
        task.setTicketId(req.ticketId().trim());
        task.setTitle(req.title().trim());
        task.setDescription(req.description());
        task.setType(req.type());
        task.setNote(req.note());

        task.setBeAssignee(resolveUser(req.beAssigneeId()));
        task.setUiAssignee(req.type() == Task.Type.BE ? null : resolveUser(req.uiAssigneeId()));
        task.setTestAssignee(resolveUser(req.testAssigneeId()));

        BigDecimal dev = req.devEffort() == null ? BigDecimal.ZERO : req.devEffort();
        BigDecimal test = req.testEffort() == null ? BigDecimal.ZERO : req.testEffort();
        task.setDevEffort(dev);
        task.setTestEffort(test);
        task.setTotalEffort(dev.add(test));

        TaskStatus status = statusRepository.findById(req.statusId())
                .orElseThrow(() -> ApiException.badRequest("INVALID_STATUS", "Unknown status"));
        task.setStatus(status);
    }

    private User resolveUser(UUID id) {
        if (id == null) return null;
        return userRepository.findById(id)
                .orElseThrow(() -> ApiException.badRequest("INVALID_ASSIGNEE", "Unknown user: " + id));
    }

    @Transactional
    public void delete(UUID taskId) {
        Task task = getTaskOrThrow(taskId);
        epicAccessService.assertAccess(task.getEpic().getId());
        taskRepository.delete(task);
    }

    @Transactional
    public Task link(UUID taskId, UUID targetTaskId) {
        if (taskId.equals(targetTaskId)) {
            throw ApiException.badRequest("INVALID_LINK", "A task cannot be linked to itself");
        }
        Task task = getTaskOrThrow(taskId);
        Task target = getTaskOrThrow(targetTaskId);
        epicAccessService.assertAccess(task.getEpic().getId());

        if (task.getType() == target.getType()) {
            throw ApiException.badRequest("INVALID_LINK", "Only a BE task can be linked to a UI task");
        }
        if (!task.getEpic().getId().equals(target.getEpic().getId())) {
            throw ApiException.badRequest("INVALID_LINK", "Tasks must belong to the same epic");
        }

        Task beTask = task.getType() == Task.Type.BE ? task : target;
        Task uiTask = task.getType() == Task.Type.UI ? task : target;
        if (taskLinkRepository.existsByBeTaskIdAndUiTaskId(beTask.getId(), uiTask.getId())) {
            throw ApiException.conflict("ALREADY_LINKED", "These tasks are already linked");
        }

        TaskLink link = new TaskLink();
        link.setBeTask(beTask);
        link.setUiTask(uiTask);
        taskLinkRepository.save(link);
        return task;
    }

    @Transactional
    public void unlink(UUID taskId, UUID targetTaskId) {
        Task task = getTaskOrThrow(taskId);
        Task target = getTaskOrThrow(targetTaskId);
        epicAccessService.assertAccess(task.getEpic().getId());

        Task beTask = task.getType() == Task.Type.BE ? task : target;
        Task uiTask = task.getType() == Task.Type.UI ? task : target;
        taskLinkRepository.deleteByBeTaskIdAndUiTaskId(beTask.getId(), uiTask.getId());
    }

    @Transactional
    public void reorder(UUID epicId, List<UUID> orderedIds) {
        epicAccessService.assertAccess(epicId);
        getEpicOrThrow(epicId);
        List<Task> tasks = taskRepository.findAllByEpicIdOrderBySortOrderAsc(epicId);
        var byId = tasks.stream().collect(java.util.stream.Collectors.toMap(Task::getId, t -> t));
        int order = 0;
        for (UUID id : orderedIds) {
            Task t = byId.get(id);
            if (t == null) continue;
            t.setSortOrder(order++);
            taskRepository.save(t);
        }
    }

    public List<Task> linkedPartnersOf(Task task) {
        if (task.getType() == Task.Type.BE) {
            return taskLinkRepository.findAllByBeTaskId(task.getId()).stream().map(TaskLink::getUiTask).toList();
        }
        return taskLinkRepository.findAllByUiTaskId(task.getId()).stream().map(TaskLink::getBeTask).toList();
    }

    public TaskResponse toResponse(Task task) {
        return TaskResponse.from(task, linkedPartnersOf(task));
    }

    public List<TaskResponse> toResponses(List<Task> tasks) {
        if (tasks.isEmpty()) return List.of();
        UUID epicId = tasks.get(0).getEpic().getId();
        Map<UUID, List<Task>> partnersByTaskId = new HashMap<>();
        for (TaskLink link : taskLinkRepository.findAllByEpicId(epicId)) {
            partnersByTaskId.computeIfAbsent(link.getBeTask().getId(), k -> new ArrayList<>()).add(link.getUiTask());
            partnersByTaskId.computeIfAbsent(link.getUiTask().getId(), k -> new ArrayList<>()).add(link.getBeTask());
        }
        return tasks.stream()
                .map(t -> TaskResponse.from(t, partnersByTaskId.getOrDefault(t.getId(), List.of())))
                .toList();
    }

    private Epic getEpicOrThrow(UUID epicId) {
        return epicRepository.findById(epicId).orElseThrow(() -> ApiException.notFound("Epic not found"));
    }

    private Task getTaskOrThrow(UUID id) {
        return taskRepository.findById(id).orElseThrow(() -> ApiException.notFound("Task not found"));
    }

    public Task getOrThrow(UUID id) {
        return getTaskOrThrow(id);
    }
}
