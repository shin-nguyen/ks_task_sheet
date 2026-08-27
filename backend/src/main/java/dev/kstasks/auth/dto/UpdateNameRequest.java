package dev.kstasks.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateNameRequest(@NotBlank @Size(max = 120) String name) {
}
