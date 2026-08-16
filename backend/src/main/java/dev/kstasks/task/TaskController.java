package dev.kstasks.task;

import dev.kstasks.task.dto.LinkRequest;
import dev.kstasks.task.dto.ReorderTasksRequest;
import dev.kstasks.task.dto.TaskRequest;
import dev.kstasks.task.dto.TaskResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Transactional
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping("/epics/{epicId}/tasks")
    public List<TaskResponse> list(@PathVariable UUID epicId) {
        return taskService.toResponses(taskService.listByEpic(epicId));
    }

    @PostMapping("/epics/{epicId}/tasks")
    public ResponseEntity<TaskResponse> create(@PathVariable UUID epicId, @Valid @RequestBody TaskRequest req) {
        Task task = taskService.create(epicId, req);
        return ResponseEntity.status(HttpStatus.CREATED).body(taskService.toResponse(task));
    }

    @PutMapping("/tasks/{id}")
    public TaskResponse update(@PathVariable UUID id, @Valid @RequestBody TaskRequest req) {
        return taskService.toResponse(taskService.update(id, req));
    }

    @DeleteMapping("/tasks/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        taskService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/tasks/{id}/link")
    public TaskResponse link(@PathVariable UUID id, @Valid @RequestBody LinkRequest req) {
        return taskService.toResponse(taskService.link(id, req.targetTaskId()));
    }

    @DeleteMapping("/tasks/{id}/link/{targetTaskId}")
    public ResponseEntity<Void> unlink(@PathVariable UUID id, @PathVariable UUID targetTaskId) {
        taskService.unlink(id, targetTaskId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/epics/{epicId}/tasks/reorder")
    public ResponseEntity<Void> reorder(@PathVariable UUID epicId, @Valid @RequestBody ReorderTasksRequest req) {
        taskService.reorder(epicId, req.orderedIds());
        return ResponseEntity.noContent().build();
    }
}
