package dev.kstasks.document;

import dev.kstasks.auth.CurrentUser;
import dev.kstasks.auth.User;
import dev.kstasks.common.ApiException;
import dev.kstasks.document.dto.DocumentResponse;
import dev.kstasks.document.dto.RenameDocumentRequest;
import dev.kstasks.epic.EpicAccessService;
import dev.kstasks.epic.EpicRepository;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Transactional
public class DocumentController {

    private final EpicDocumentRepository documentRepository;
    private final EpicRepository epicRepository;
    private final EpicAccessService epicAccessService;
    private final DocumentStorageService storageService;

    public DocumentController(EpicDocumentRepository documentRepository, EpicRepository epicRepository,
                               EpicAccessService epicAccessService, DocumentStorageService storageService) {
        this.documentRepository = documentRepository;
        this.epicRepository = epicRepository;
        this.epicAccessService = epicAccessService;
        this.storageService = storageService;
    }

    @GetMapping("/epics/{epicId}/documents")
    public List<DocumentResponse> list(@PathVariable UUID epicId) {
        epicAccessService.assertAccess(epicId);
        return documentRepository.findAllByEpicIdOrderByCreatedAtDesc(epicId).stream().map(DocumentResponse::from).toList();
    }

    @PostMapping("/epics/{epicId}/documents")
    public ResponseEntity<DocumentResponse> upload(@PathVariable UUID epicId,
                                                     @RequestParam("file") MultipartFile file,
                                                     @RequestParam(value = "displayName", required = false) String displayName) {
        epicAccessService.assertAccess(epicId);
        var epic = epicRepository.findById(epicId).orElseThrow(() -> ApiException.notFound("Epic not found"));
        if (file.isEmpty()) {
            throw ApiException.badRequest("EMPTY_FILE", "File is empty");
        }

        DocumentStorageService.StoredFile stored = storageService.store(file);

        EpicDocument doc = new EpicDocument();
        doc.setEpic(epic);
        doc.setDisplayName(displayName != null && !displayName.isBlank() ? displayName.trim() : file.getOriginalFilename());
        doc.setOriginalFilename(file.getOriginalFilename());
        doc.setStoredFilename(stored.storedFilename());
        doc.setContentType(stored.contentType());
        doc.setSizeBytes(stored.sizeBytes());
        doc.setUploadedBy(CurrentUser.get());
        doc = documentRepository.save(doc);
        return ResponseEntity.status(HttpStatus.CREATED).body(DocumentResponse.from(doc));
    }

    @GetMapping("/documents/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable UUID id) {
        EpicDocument doc = documentRepository.findById(id).orElseThrow(() -> ApiException.notFound("Document not found"));
        epicAccessService.assertAccess(doc.getEpic().getId());
        Resource resource = storageService.load(doc.getStoredFilename());
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(doc.getDisplayName(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(doc.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(resource);
    }

    @PatchMapping("/documents/{id}")
    public DocumentResponse rename(@PathVariable UUID id, @Valid @RequestBody RenameDocumentRequest req) {
        EpicDocument doc = getOwnedOrThrow(id);
        doc.setDisplayName(req.displayName().trim());
        return DocumentResponse.from(documentRepository.save(doc));
    }

    @DeleteMapping("/documents/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        EpicDocument doc = getOwnedOrThrow(id);
        documentRepository.delete(doc);
        storageService.delete(doc.getStoredFilename());
        return ResponseEntity.noContent().build();
    }

    private EpicDocument getOwnedOrThrow(UUID id) {
        EpicDocument doc = documentRepository.findById(id).orElseThrow(() -> ApiException.notFound("Document not found"));
        epicAccessService.assertAccess(doc.getEpic().getId());
        User current = CurrentUser.get();
        boolean owner = doc.getUploadedBy().getId().equals(current.getId());
        if (!owner && current.getRole() != User.Role.ADMIN) {
            throw ApiException.badRequest("NOT_OWNER", "Only the uploader or an admin can rename or delete this document");
        }
        return doc;
    }
}
