package dev.kstasks.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminResetPasswordRequest(@NotBlank @Size(min = 6, max = 100) String newPassword) {
}
