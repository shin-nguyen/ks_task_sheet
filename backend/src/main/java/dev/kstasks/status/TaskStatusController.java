package dev.kstasks.status;

import dev.kstasks.status.dto.ReorderRequest;
import dev.kstasks.status.dto.TaskStatusRequest;
import dev.kstasks.status.dto.TaskStatusResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/statuses")
public class TaskStatusController {

    private final TaskStatusService statusService;

    public TaskStatusController(TaskStatusService statusService) {
        this.statusService = statusService;
    }

    @GetMapping
    public List<TaskStatusResponse> list() {
        return statusService.list().stream().map(TaskStatusResponse::from).toList();
    }

    @PostMapping
    public ResponseEntity<TaskStatusResponse> create(@Valid @RequestBody TaskStatusRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(TaskStatusResponse.from(statusService.create(req)));
    }

    @PutMapping("/{id}")
    public TaskStatusResponse update(@PathVariable UUID id, @Valid @RequestBody TaskStatusRequest req) {
        return TaskStatusResponse.from(statusService.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        statusService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/reorder")
    public ResponseEntity<Void> reorder(@Valid @RequestBody ReorderRequest req) {
        statusService.reorder(req.orderedIds());
        return ResponseEntity.noContent().build();
    }
}
