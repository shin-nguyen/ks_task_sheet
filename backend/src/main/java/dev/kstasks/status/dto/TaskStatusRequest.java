package dev.kstasks.status.dto;

import dev.kstasks.status.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record TaskStatusRequest(
        @NotBlank String name,
        @NotBlank @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "must be a hex color like #94A3A8") String color,
        @NotNull TaskStatus.Category category
) {
}
