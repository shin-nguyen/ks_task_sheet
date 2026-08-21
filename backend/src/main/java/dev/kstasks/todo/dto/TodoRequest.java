package dev.kstasks.todo.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;
import java.util.UUID;

public record TodoRequest(@NotBlank String title, UUID assigneeId, LocalDate dueDate, boolean done) {
}
