package dev.kstasks.csvimport;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.kstasks.common.ApiException;
import dev.kstasks.csvimport.dto.ImportMappingRequest;
import dev.kstasks.csvimport.dto.ImportResult;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/epics/{epicId}/tasks")
public class CsvImportController {

    private final CsvImportService csvImportService;
    private final ObjectMapper objectMapper;

    public CsvImportController(CsvImportService csvImportService, ObjectMapper objectMapper) {
        this.csvImportService = csvImportService;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/import")
    public ImportResult importTasks(@PathVariable UUID epicId,
                                     @RequestParam("file") MultipartFile file,
                                     @RequestParam("mapping") String mappingJson) {
        ImportMappingRequest mapping;
        try {
            mapping = objectMapper.readValue(mappingJson, ImportMappingRequest.class);
        } catch (Exception e) {
            throw ApiException.badRequest("INVALID_MAPPING", "Could not parse mapping configuration");
        }
        return csvImportService.importCsv(epicId, file, mapping);
    }
}
