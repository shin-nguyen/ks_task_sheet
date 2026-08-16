package dev.kstasks.note.dto;

import jakarta.validation.constraints.NotBlank;

public record NoteRequest(@NotBlank String content) {
}
