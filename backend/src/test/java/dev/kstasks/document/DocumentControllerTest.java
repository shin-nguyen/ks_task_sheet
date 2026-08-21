package dev.kstasks.document;

import dev.kstasks.auth.User;
import dev.kstasks.common.GlobalExceptionHandler;
import dev.kstasks.epic.Epic;
import dev.kstasks.epic.EpicAccessService;
import dev.kstasks.epic.EpicRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class DocumentControllerTest {

    private final EpicDocumentRepository documentRepository = mock(EpicDocumentRepository.class);
    private final EpicRepository epicRepository = mock(EpicRepository.class);
    private final EpicAccessService epicAccessService = mock(EpicAccessService.class);
    private final DocumentStorageService storageService = mock(DocumentStorageService.class);

    private MockMvc mockMvc;

    private final UUID epicId = UUID.randomUUID();
    private final Epic epic = new Epic();

    @BeforeEach
    void setUp() {
        epic.setId(epicId);
        DocumentController controller = new DocumentController(documentRepository, epicRepository, epicAccessService, storageService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private User user(String email, User.Role role) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setEmail(email);
        u.setName(email);
        u.setPassword("hash");
        u.setRole(role);
        return u;
    }

    private void authenticateAs(User user) {
        var auth = new UsernamePasswordAuthenticationToken(user, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    void uploadDownloadRenameDeleteHappyPath() throws Exception {
        User uploader = user("uploader@team.dev", User.Role.MEMBER);
        authenticateAs(uploader);

        when(epicRepository.findById(epicId)).thenReturn(Optional.of(epic));
        when(storageService.store(any())).thenReturn(new DocumentStorageService.StoredFile("abc123.txt", 5, "text/plain"));
        when(documentRepository.save(any(EpicDocument.class))).thenAnswer(inv -> {
            EpicDocument d = inv.getArgument(0);
            if (d.getId() == null) d.setId(UUID.randomUUID());
            return d;
        });

        MockMultipartFile file = new MockMultipartFile("file", "spec.txt", "text/plain", "hello".getBytes(StandardCharsets.UTF_8));

        String uploadJson = mockMvc.perform(multipart("/api/v1/epics/{epicId}/documents", epicId)
                        .file(file)
                        .param("displayName", "My Spec"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.displayName").value("My Spec"))
                .andExpect(jsonPath("$.originalFilename").value("spec.txt"))
                .andReturn().getResponse().getContentAsString();

        UUID documentId = extractId(uploadJson);

        EpicDocument stored = new EpicDocument();
        stored.setId(documentId);
        stored.setEpic(epic);
        stored.setDisplayName("My Spec");
        stored.setOriginalFilename("spec.txt");
        stored.setStoredFilename("abc123.txt");
        stored.setContentType("text/plain");
        stored.setSizeBytes(5);
        stored.setUploadedBy(uploader);

        when(documentRepository.findById(documentId)).thenReturn(Optional.of(stored));
        when(storageService.load("abc123.txt")).thenReturn(new ByteArrayResource("hello".getBytes(StandardCharsets.UTF_8)));

        mockMvc.perform(get("/api/v1/documents/{id}/download", documentId))
                .andExpect(status().isOk())
                .andExpect(header().exists("Content-Disposition"));

        when(documentRepository.save(any(EpicDocument.class))).thenAnswer(inv -> inv.getArgument(0));

        mockMvc.perform(patch("/api/v1/documents/{id}", documentId)
                        .contentType("application/json")
                        .content("{\"displayName\":\"Renamed Spec\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Renamed Spec"));

        mockMvc.perform(delete("/api/v1/documents/{id}", documentId))
                .andExpect(status().isNoContent());

        verify(documentRepository).delete(stored);
        verify(storageService).delete("abc123.txt");
    }

    @Test
    void renameRejectedForNonOwnerNonAdmin() throws Exception {
        User uploader = user("uploader@team.dev", User.Role.MEMBER);
        User other = user("other@team.dev", User.Role.MEMBER);
        authenticateAs(other);

        UUID documentId = UUID.randomUUID();
        EpicDocument doc = new EpicDocument();
        doc.setId(documentId);
        doc.setEpic(epic);
        doc.setDisplayName("My Spec");
        doc.setOriginalFilename("spec.txt");
        doc.setStoredFilename("abc123.txt");
        doc.setContentType("text/plain");
        doc.setSizeBytes(5);
        doc.setUploadedBy(uploader);

        when(documentRepository.findById(documentId)).thenReturn(Optional.of(doc));

        mockMvc.perform(patch("/api/v1/documents/{id}", documentId)
                        .contentType("application/json")
                        .content("{\"displayName\":\"Hijacked\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("NOT_OWNER"));
    }

    @Test
    void renameAndDeleteAllowedForAdminNonUploader() throws Exception {
        User uploader = user("uploader@team.dev", User.Role.MEMBER);
        User admin = user("admin@team.dev", User.Role.ADMIN);
        authenticateAs(admin);

        UUID documentId = UUID.randomUUID();
        EpicDocument doc = new EpicDocument();
        doc.setId(documentId);
        doc.setEpic(epic);
        doc.setDisplayName("My Spec");
        doc.setOriginalFilename("spec.txt");
        doc.setStoredFilename("abc123.txt");
        doc.setContentType("text/plain");
        doc.setSizeBytes(5);
        doc.setUploadedBy(uploader);

        when(documentRepository.findById(documentId)).thenReturn(Optional.of(doc));
        when(documentRepository.save(any(EpicDocument.class))).thenAnswer(inv -> inv.getArgument(0));

        mockMvc.perform(patch("/api/v1/documents/{id}", documentId)
                        .contentType("application/json")
                        .content("{\"displayName\":\"Renamed by admin\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Renamed by admin"));

        mockMvc.perform(delete("/api/v1/documents/{id}", documentId))
                .andExpect(status().isNoContent());

        verify(documentRepository).delete(doc);
        verify(storageService).delete("abc123.txt");
    }

    private UUID extractId(String json) {
        int start = json.indexOf("\"id\":\"") + 6;
        int end = json.indexOf('"', start);
        return UUID.fromString(json.substring(start, end));
    }
}
