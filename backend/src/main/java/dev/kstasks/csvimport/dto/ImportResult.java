package dev.kstasks.csvimport.dto;

import java.util.ArrayList;
import java.util.List;

public class ImportResult {
    public int created = 0;
    public int updated = 0;
    public int skipped = 0;
    public List<RowIssue> errors = new ArrayList<>();
    public List<RowIssue> warnings = new ArrayList<>();

    public record RowIssue(int row, String reason) {
    }
}
