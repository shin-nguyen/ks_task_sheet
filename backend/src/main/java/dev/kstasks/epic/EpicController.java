package dev.kstasks.epic;

import dev.kstasks.auth.CurrentUser;
import dev.kstasks.epic.dto.EpicRequest;
import dev.kstasks.epic.dto.EpicResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/epics")
@Transactional
public class EpicController {

    private final EpicService epicService;
    private final EpicAccessService epicAccessService;

    public EpicController(EpicService epicService, EpicAccessService epicAccessService) {
        this.epicService = epicService;
        this.epicAccessService = epicAccessService;
    }

    @GetMapping
    public List<EpicResponse> list() {
        return epicService.list(CurrentUser.get()).stream()
                .map(e -> EpicResponse.from(e, epicService.taskCount(e.getId())))
                .toList();
    }

    @GetMapping("/{id}")
    public EpicResponse get(@PathVariable UUID id) {
        epicAccessService.assertAccess(id);
        var epic = epicService.getOrThrow(id);
        return EpicResponse.from(epic, epicService.taskCount(id));
    }

    @PostMapping
    public ResponseEntity<EpicResponse> create(@Valid @RequestBody EpicRequest req) {
        var epic = epicService.create(req, CurrentUser.get());
        return ResponseEntity.status(HttpStatus.CREATED).body(EpicResponse.from(epic, 0));
    }

    @PutMapping("/{id}")
    public EpicResponse update(@PathVariable UUID id, @Valid @RequestBody EpicRequest req) {
        epicAccessService.assertAccess(id);
        var epic = epicService.update(id, req);
        return EpicResponse.from(epic, epicService.taskCount(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        epicService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
