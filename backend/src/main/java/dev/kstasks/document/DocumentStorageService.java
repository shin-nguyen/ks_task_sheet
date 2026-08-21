package dev.kstasks.document;

import dev.kstasks.common.ApiException;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@Service
public class DocumentStorageService {

    private static final Logger log = LoggerFactory.getLogger(DocumentStorageService.class);

    @Value("${app.storage.documents-dir}")
    private String documentsDir;

    private Path baseDir;

    @PostConstruct
    void init() throws IOException {
        baseDir = Path.of(documentsDir).toAbsolutePath().normalize();
        Files.createDirectories(baseDir);
    }

    public record StoredFile(String storedFilename, long sizeBytes, String contentType) {
    }

    public StoredFile store(MultipartFile file) {
        String extension = safeExtension(file.getOriginalFilename());
        String storedFilename = UUID.randomUUID() + extension;
        Path target = baseDir.resolve(storedFilename).normalize();
        if (!target.getParent().equals(baseDir)) {
            throw ApiException.badRequest("INVALID_FILE", "Invalid file name");
        }
        try {
            file.transferTo(target);
        } catch (IOException e) {
            throw new RuntimeException("Failed to store uploaded file", e);
        }
        String contentType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";
        return new StoredFile(storedFilename, file.getSize(), contentType);
    }

    public Resource load(String storedFilename) {
        Path path = baseDir.resolve(storedFilename).normalize();
        if (!path.getParent().equals(baseDir) || !Files.exists(path)) {
            throw ApiException.notFound("Document file not found");
        }
        return new PathResource(path);
    }

    public void delete(String storedFilename) {
        try {
            Path path = baseDir.resolve(storedFilename).normalize();
            if (path.getParent().equals(baseDir)) {
                Files.deleteIfExists(path);
            }
        } catch (IOException e) {
            log.warn("Failed to delete stored document file {}: {}", storedFilename, e.getMessage());
        }
    }

    private String safeExtension(String originalFilename) {
        if (originalFilename == null) {
            return "";
        }
        String name = originalFilename.replace('\\', '/');
        int slash = name.lastIndexOf('/');
        if (slash >= 0) {
            name = name.substring(slash + 1);
        }
        int dot = name.lastIndexOf('.');
        if (dot < 0 || dot == name.length() - 1) {
            return "";
        }
        String ext = name.substring(dot).replaceAll("[^a-zA-Z0-9.]", "");
        return ext.length() > 20 ? "" : ext;
    }
}
