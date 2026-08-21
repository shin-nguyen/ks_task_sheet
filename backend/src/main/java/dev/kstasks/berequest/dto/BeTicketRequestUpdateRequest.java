package dev.kstasks.berequest.dto;

import jakarta.validation.constraints.NotBlank;

public record BeTicketRequestUpdateRequest(@NotBlank String note, String apiDesign, boolean resolved) {
}
