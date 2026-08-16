package dev.kstasks.csvimport;

import dev.kstasks.auth.User;
import dev.kstasks.auth.UserRepository;
import dev.kstasks.common.ApiException;
import dev.kstasks.csvimport.dto.ImportMappingRequest;
import dev.kstasks.csvimport.dto.ImportResult;
import dev.kstasks.epic.Epic;
import dev.kstasks.epic.EpicAccessService;
import dev.kstasks.epic.EpicRepository;
import dev.kstasks.status.TaskStatus;
import dev.kstasks.status.TaskStatusRepository;
import dev.kstasks.task.Task;
import dev.kstasks.task.TaskRepository;
import jakarta.transaction.Transactional;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class CsvImportService {

    private final EpicRepository epicRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final TaskStatusRepository statusRepository;
    private final EpicAccessService epicAccessService;

    public CsvImportService(EpicRepository epicRepository, TaskRepository taskRepository,
                             UserRepository userRepository, TaskStatusRepository statusRepository,
                             EpicAccessService epicAccessService) {
        this.epicRepository = epicRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.statusRepository = statusRepository;
        this.epicAccessService = epicAccessService;
    }

    @Transactional
    public ImportResult importCsv(java.util.UUID epicId, MultipartFile file, ImportMappingRequest mapping) {
        epicAccessService.assertAccess(epicId);
        Epic epic = epicRepository.findById(epicId).orElseThrow(() -> ApiException.notFound("Epic not found"));
        Task.Type defaultType = "UI".equalsIgnoreCase(mapping.defaultType()) ? Task.Type.UI : Task.Type.BE;
        boolean updateOnDuplicate = "UPDATE".equalsIgnoreCase(mapping.duplicateStrategy());
        TaskStatus defaultStatus = statusRepository.findFirstByOrderBySortOrderAsc()
                .orElseThrow(() -> ApiException.badRequest("NO_STATUS", "No task statuses configured"));

        List<User> allUsers = userRepository.findAll();
        Map<String, String> columnMap = mapping.columnMap() != null ? mapping.columnMap() : Map.of();

        ImportResult result = new ImportResult();

        String content;
        try {
            byte[] bytes = file.getBytes();
            content = new String(bytes, StandardCharsets.UTF_8);
            if (!content.isEmpty() && content.charAt(0) == '﻿') {
                content = content.substring(1);
            }
        } catch (IOException e) {
            throw ApiException.badRequest("FILE_READ_ERROR", "Could not read uploaded file");
        }

        CSVFormat format = CSVFormat.DEFAULT.builder()
                .setHeader()
                .setSkipHeaderRecord(true)
                .setTrim(true)
                .setIgnoreEmptyLines(true)
                .build();

        long nextSortOrder = taskRepository.countByEpicId(epicId);

        try (CSVParser parser = CSVParser.parse(content, format)) {
            int rowNum = 1; // header is row 0
            for (CSVRecord record : parser) {
                rowNum++;
                try {
                    String ticketId = mappedValue(record, columnMap, "TICKET_ID");
                    if (isBlank(ticketId)) {
                        result.errors.add(new ImportResult.RowIssue(rowNum, "Missing ticket ID"));
                        continue;
                    }
                    String title = mappedValue(record, columnMap, "TITLE");
                    if (isBlank(title)) {
                        result.errors.add(new ImportResult.RowIssue(rowNum, "Missing title"));
                        continue;
                    }

                    String typeRaw = mappedValue(record, columnMap, "TYPE");
                    Task.Type type = resolveType(typeRaw, defaultType);

                    String description = mappedValue(record, columnMap, "DESCRIPTION");
                    String note = mappedValue(record, columnMap, "NOTE");
                    String assigneeRaw = mappedValue(record, columnMap, "ASSIGNEE");

                    User matchedUser = null;
                    if (!isBlank(assigneeRaw)) {
                        matchedUser = matchUser(allUsers, assigneeRaw);
                        if (matchedUser == null) {
                            result.warnings.add(new ImportResult.RowIssue(rowNum, "Assignee '" + assigneeRaw + "' not found — left unassigned"));
                        }
                    }

                    BigDecimal devEffort = parseEffort(mappedValue(record, columnMap, "DEV_EFFORT"), result, rowNum, "Dev effort");
                    BigDecimal testEffort = parseEffort(mappedValue(record, columnMap, "TEST_EFFORT"), result, rowNum, "Test effort");

                    Optional<Task> existing = taskRepository.findAllByEpicIdOrderBySortOrderAsc(epicId).stream()
                            .filter(t -> t.getTicketId().equalsIgnoreCase(ticketId.trim()))
                            .findFirst();

                    if (existing.isPresent()) {
                        if (!updateOnDuplicate) {
                            result.skipped++;
                            continue;
                        }
                        Task task = existing.get();
                        applyImportedFields(task, ticketId, title, description, type, note, matchedUser, devEffort, testEffort);
                        taskRepository.save(task);
                        result.updated++;
                    } else {
                        Task task = new Task();
                        task.setEpic(epic);
                        task.setStatus(defaultStatus);
                        task.setSortOrder((int) nextSortOrder++);
                        applyImportedFields(task, ticketId, title, description, type, note, matchedUser, devEffort, testEffort);
                        taskRepository.save(task);
                        result.created++;
                    }
                } catch (Exception rowEx) {
                    result.errors.add(new ImportResult.RowIssue(rowNum, "Unexpected error: " + rowEx.getMessage()));
                }
            }
        } catch (IOException e) {
            throw ApiException.badRequest("CSV_PARSE_ERROR", "Could not parse CSV file: " + e.getMessage());
        }

        return result;
    }

    private void applyImportedFields(Task task, String ticketId, String title, String description, Task.Type type,
                                      String note, User matchedUser, BigDecimal devEffort, BigDecimal testEffort) {
        task.setTicketId(ticketId.trim());
        task.setTitle(title.trim());
        task.setDescription(description);
        task.setType(type);
        task.setNote(note);
        if (type == Task.Type.BE) {
            task.setBeAssignee(matchedUser);
        } else {
            task.setUiAssignee(matchedUser);
        }
        task.setDevEffort(devEffort);
        task.setTestEffort(testEffort);
        task.setTotalEffort(devEffort.add(testEffort));
    }

    private Task.Type resolveType(String raw, Task.Type defaultType) {
        if (isBlank(raw)) return defaultType;
        String v = raw.toLowerCase();
        if (v.contains("be") || v.contains("backend")) return Task.Type.BE;
        if (v.contains("ui") || v.contains("frontend")) return Task.Type.UI;
        return defaultType;
    }

    private User matchUser(List<User> users, String raw) {
        String v = raw.trim();
        return users.stream().filter(u -> u.getEmail().equalsIgnoreCase(v)).findFirst()
                .or(() -> users.stream().filter(u -> u.getName().equalsIgnoreCase(v)).findFirst())
                .orElse(null);
    }

    private BigDecimal parseEffort(String raw, ImportResult result, int rowNum, String label) {
        if (isBlank(raw)) return BigDecimal.ZERO;
        try {
            String normalized = raw.trim().replace(',', '.');
            return new BigDecimal(normalized);
        } catch (NumberFormatException e) {
            result.warnings.add(new ImportResult.RowIssue(rowNum, label + " '" + raw + "' is not a valid number — defaulted to 0"));
            return BigDecimal.ZERO;
        }
    }

    private String mappedValue(CSVRecord record, Map<String, String> columnMap, String field) {
        String csvColumn = columnMap.entrySet().stream()
                .filter(e -> field.equalsIgnoreCase(e.getValue()))
                .map(Map.Entry::getKey)
                .findFirst()
                .orElse(null);
        if (csvColumn == null || !record.isMapped(csvColumn)) return null;
        return record.get(csvColumn);
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
