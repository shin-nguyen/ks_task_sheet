package dev.kstasks.common;

import java.util.List;
import java.util.Map;

public record ApiErrorResponse(ErrorBody error) {
    public record ErrorBody(String code, String message, List<FieldErrorItem> fieldErrors) {
    }

    public record FieldErrorItem(String field, String message) {
    }

    public static ApiErrorResponse of(String code, String message) {
        return new ApiErrorResponse(new ErrorBody(code, message, null));
    }

    public static ApiErrorResponse of(String code, String message, List<FieldErrorItem> fieldErrors) {
        return new ApiErrorResponse(new ErrorBody(code, message, fieldErrors));
    }

    public static ApiErrorResponse of(String code, String message, Map<String, String> fields) {
        List<FieldErrorItem> items = fields.entrySet().stream()
                .map(e -> new FieldErrorItem(e.getKey(), e.getValue()))
                .toList();
        return new ApiErrorResponse(new ErrorBody(code, message, items));
    }
}
