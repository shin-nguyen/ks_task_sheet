package dev.kstasks.note;

import dev.kstasks.auth.CurrentUser;
import dev.kstasks.common.ApiException;
import dev.kstasks.epic.EpicAccessService;
import dev.kstasks.epic.EpicRepository;
import dev.kstasks.note.dto.NoteRequest;
import dev.kstasks.note.dto.NoteResponse;
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
public class NoteController {

    private final EpicNoteRepository noteRepository;
    private final EpicRepository epicRepository;
    private final EpicAccessService epicAccessService;

    public NoteController(EpicNoteRepository noteRepository, EpicRepository epicRepository, EpicAccessService epicAccessService) {
        this.noteRepository = noteRepository;
        this.epicRepository = epicRepository;
        this.epicAccessService = epicAccessService;
    }

    @GetMapping("/epics/{epicId}/notes")
    public List<NoteResponse> list(@PathVariable UUID epicId) {
        epicAccessService.assertAccess(epicId);
        return noteRepository.findAllByEpicIdOrderByCreatedAtDesc(epicId).stream().map(NoteResponse::from).toList();
    }

    @PostMapping("/epics/{epicId}/notes")
    public ResponseEntity<NoteResponse> create(@PathVariable UUID epicId, @Valid @RequestBody NoteRequest req) {
        epicAccessService.assertAccess(epicId);
        var epic = epicRepository.findById(epicId).orElseThrow(() -> ApiException.notFound("Epic not found"));
        EpicNote note = new EpicNote();
        note.setEpic(epic);
        note.setContent(req.content());
        note.setAuthor(CurrentUser.get());
        note = noteRepository.save(note);
        return ResponseEntity.status(HttpStatus.CREATED).body(NoteResponse.from(note));
    }

    @PutMapping("/notes/{id}")
    public NoteResponse update(@PathVariable UUID id, @Valid @RequestBody NoteRequest req) {
        EpicNote note = getOwnedOrThrow(id);
        note.setContent(req.content());
        return NoteResponse.from(noteRepository.save(note));
    }

    @DeleteMapping("/notes/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        EpicNote note = getOwnedOrThrow(id);
        noteRepository.delete(note);
        return ResponseEntity.noContent().build();
    }

    private EpicNote getOwnedOrThrow(UUID id) {
        EpicNote note = noteRepository.findById(id).orElseThrow(() -> ApiException.notFound("Note not found"));
        epicAccessService.assertAccess(note.getEpic().getId());
        if (!note.getAuthor().getId().equals(CurrentUser.get().getId())) {
            throw ApiException.badRequest("NOT_AUTHOR", "Only the author can edit or delete this note");
        }
        return note;
    }
}
