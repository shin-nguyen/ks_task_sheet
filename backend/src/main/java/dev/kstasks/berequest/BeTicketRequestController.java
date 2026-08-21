package dev.kstasks.berequest;

import dev.kstasks.auth.CurrentUser;
import dev.kstasks.berequest.dto.BeTicketRequestCreateRequest;
import dev.kstasks.berequest.dto.BeTicketRequestResponse;
import dev.kstasks.berequest.dto.BeTicketRequestUpdateRequest;
import dev.kstasks.common.ApiException;
import dev.kstasks.epic.Epic;
import dev.kstasks.epic.EpicAccessService;
import dev.kstasks.epic.EpicRepository;
import dev.kstasks.task.Task;
import dev.kstasks.task.TaskRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Transactional
public class BeTicketRequestController {

    private final BeTicketRequestRepository beTicketRequestRepository;
    private final EpicRepository epicRepository;
    private final TaskRepository taskRepository;
    private final EpicAccessService epicAccessService;

    public BeTicketRequestController(BeTicketRequestRepository beTicketRequestRepository, EpicRepository epicRepository,
                                      TaskRepository taskRepository, EpicAccessService epicAccessService) {
        this.beTicketRequestRepository = beTicketRequestRepository;
        this.epicRepository = epicRepository;
        this.taskRepository = taskRepository;
        this.epicAccessService = epicAccessService;
    }

    @GetMapping("/epics/{epicId}/be-requests")
    public List<BeTicketRequestResponse> list(@PathVariable UUID epicId) {
        epicAccessService.assertAccess(epicId);
        return beTicketRequestRepository.findAllByEpicIdOrderByCreatedAtDesc(epicId).stream()
                .map(BeTicketRequestResponse::from).toList();
    }

    @PostMapping("/epics/{epicId}/be-requests")
    public ResponseEntity<BeTicketRequestResponse> create(@PathVariable UUID epicId, @Valid @RequestBody BeTicketRequestCreateRequest req) {
        epicAccessService.assertAccess(epicId);
        Epic epic = epicRepository.findById(epicId).orElseThrow(() -> ApiException.notFound("Epic not found"));
        Task uiTask = taskRepository.findById(req.uiTaskId())
                .orElseThrow(() -> ApiException.badRequest("INVALID_TASK", "Unknown task: " + req.uiTaskId()));
        if (uiTask.getType() != Task.Type.UI) {
            throw ApiException.badRequest("INVALID_TASK", "Only a UI task can have a BE-ticket request");
        }
        if (!uiTask.getEpic().getId().equals(epicId)) {
            throw ApiException.badRequest("INVALID_TASK", "Task must belong to this epic");
        }

        BeTicketRequest request = new BeTicketRequest();
        request.setEpic(epic);
        request.setUiTask(uiTask);
        request.setNote(req.note().trim());
        request.setResolved(false);
        request.setCreatedBy(CurrentUser.get());
        request = beTicketRequestRepository.save(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(BeTicketRequestResponse.from(request));
    }

    @PutMapping("/be-requests/{id}")
    public BeTicketRequestResponse update(@PathVariable UUID id, @Valid @RequestBody BeTicketRequestUpdateRequest req) {
        BeTicketRequest request = getAccessibleOrThrow(id);
        request.setNote(req.note().trim());
        if (req.resolved() && !request.isResolved()) {
            request.setResolvedAt(Instant.now());
        } else if (!req.resolved() && request.isResolved()) {
            request.setResolvedAt(null);
        }
        request.setResolved(req.resolved());
        return BeTicketRequestResponse.from(beTicketRequestRepository.save(request));
    }

    @DeleteMapping("/be-requests/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        BeTicketRequest request = getAccessibleOrThrow(id);
        beTicketRequestRepository.delete(request);
        return ResponseEntity.noContent().build();
    }

    private BeTicketRequest getAccessibleOrThrow(UUID id) {
        BeTicketRequest request = beTicketRequestRepository.findById(id).orElseThrow(() -> ApiException.notFound("BE-ticket request not found"));
        epicAccessService.assertAccess(request.getEpic().getId());
        return request;
    }
}
