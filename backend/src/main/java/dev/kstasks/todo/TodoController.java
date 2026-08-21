package dev.kstasks.todo;

import dev.kstasks.auth.CurrentUser;
import dev.kstasks.auth.User;
import dev.kstasks.auth.UserRepository;
import dev.kstasks.common.ApiException;
import dev.kstasks.epic.Epic;
import dev.kstasks.epic.EpicAccessService;
import dev.kstasks.epic.EpicRepository;
import dev.kstasks.todo.dto.TodoRequest;
import dev.kstasks.todo.dto.TodoResponse;
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
public class TodoController {

    private final EpicTodoRepository todoRepository;
    private final EpicRepository epicRepository;
    private final UserRepository userRepository;
    private final EpicAccessService epicAccessService;

    public TodoController(EpicTodoRepository todoRepository, EpicRepository epicRepository,
                           UserRepository userRepository, EpicAccessService epicAccessService) {
        this.todoRepository = todoRepository;
        this.epicRepository = epicRepository;
        this.userRepository = userRepository;
        this.epicAccessService = epicAccessService;
    }

    @GetMapping("/epics/{epicId}/todos")
    public List<TodoResponse> list(@PathVariable UUID epicId) {
        epicAccessService.assertAccess(epicId);
        return todoRepository.findAllByEpicIdOrderByCreatedAtAsc(epicId).stream().map(TodoResponse::from).toList();
    }

    @PostMapping("/epics/{epicId}/todos")
    public ResponseEntity<TodoResponse> create(@PathVariable UUID epicId, @Valid @RequestBody TodoRequest req) {
        epicAccessService.assertAccess(epicId);
        Epic epic = epicRepository.findById(epicId).orElseThrow(() -> ApiException.notFound("Epic not found"));
        EpicTodo todo = new EpicTodo();
        todo.setEpic(epic);
        todo.setTitle(req.title().trim());
        todo.setAssignee(resolveAssignee(req.assigneeId()));
        todo.setDueDate(req.dueDate());
        todo.setDone(false);
        todo.setCreatedBy(CurrentUser.get());
        todo = todoRepository.save(todo);
        return ResponseEntity.status(HttpStatus.CREATED).body(TodoResponse.from(todo));
    }

    @PutMapping("/todos/{id}")
    public TodoResponse update(@PathVariable UUID id, @Valid @RequestBody TodoRequest req) {
        EpicTodo todo = getAccessibleOrThrow(id);
        todo.setTitle(req.title().trim());
        todo.setAssignee(resolveAssignee(req.assigneeId()));
        todo.setDueDate(req.dueDate());
        todo.setDone(req.done());
        return TodoResponse.from(todoRepository.save(todo));
    }

    @DeleteMapping("/todos/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        EpicTodo todo = getAccessibleOrThrow(id);
        todoRepository.delete(todo);
        return ResponseEntity.noContent().build();
    }

    private User resolveAssignee(UUID id) {
        if (id == null) return null;
        return userRepository.findById(id)
                .orElseThrow(() -> ApiException.badRequest("INVALID_ASSIGNEE", "Unknown user: " + id));
    }

    private EpicTodo getAccessibleOrThrow(UUID id) {
        EpicTodo todo = todoRepository.findById(id).orElseThrow(() -> ApiException.notFound("Todo not found"));
        epicAccessService.assertAccess(todo.getEpic().getId());
        return todo;
    }
}
