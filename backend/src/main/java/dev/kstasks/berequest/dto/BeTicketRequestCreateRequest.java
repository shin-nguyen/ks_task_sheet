package dev.kstasks.berequest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record BeTicketRequestCreateRequest(@NotNull UUID uiTaskId, @NotBlank String note, String apiDesign) {
}
