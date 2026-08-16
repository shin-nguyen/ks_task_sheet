package dev.kstasks.epic.dto;

import jakarta.validation.constraints.NotBlank;

public record EpicRequest(
        @NotBlank String ticketId,
        @NotBlank String name
) {
}
