package dev.kstasks.csvimport.dto;

import java.util.Map;

public record ImportMappingRequest(
        Map<String, String> columnMap, // csv column name -> TaskField name
        String defaultType,            // "BE" | "UI"
        String duplicateStrategy       // "SKIP" | "UPDATE"
) {
}
