package dev.kstasks.csvimport;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Validates that the sample Jira export in /samples/jira-export.csv (mirrored under
 * src/test/resources/samples for classpath access) parses the way CsvImportService expects:
 * UTF-8 with BOM, quoted multiline descriptions, and both '.' and ',' decimal separators.
 */
class JiraCsvSampleParsingTest {

    @Test
    void parsesSampleJiraExport() throws IOException {
        List<CSVRecord> records = parse("/samples/jira-export.csv");

        assertEquals(5, records.size());

        CSVRecord multiline = records.get(0);
        assertEquals("PAY-201", multiline.get("Issue key"));
        assertTrue(multiline.get("Description").contains("Include the refund amount"));
        assertTrue(multiline.get("Description").contains("\n"), "multiline quoted field should preserve the newline");

        CSVRecord commaDecimal = records.get(2);
        assertEquals("2,5", commaDecimal.get("Story Points"));
        BigDecimal parsed = new BigDecimal(commaDecimal.get("Story Points").trim().replace(',', '.'));
        assertEquals(new BigDecimal("2.5"), parsed);

        CSVRecord blankDescription = records.get(3);
        assertEquals("", blankDescription.get("Description"));

        CSVRecord invalidNumber = records.get(4);
        assertEquals("not-a-number", invalidNumber.get("Story Points"));
    }

    private List<CSVRecord> parse(String classpathResource) throws IOException {
        try (InputStream is = getClass().getResourceAsStream(classpathResource)) {
            assertNotNull(is, "sample CSV must exist on the test classpath");
            String content = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            if (!content.isEmpty() && content.charAt(0) == '﻿') {
                content = content.substring(1);
            }
            CSVFormat format = CSVFormat.DEFAULT.builder()
                    .setHeader()
                    .setSkipHeaderRecord(true)
                    .setTrim(true)
                    .setIgnoreEmptyLines(true)
                    .build();
            try (CSVParser parser = CSVParser.parse(content, format)) {
                return parser.getRecords();
            }
        }
    }
}
