package dev.kstasks.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 1, max = 120) String name,
        @NotBlank @Size(min = 6, max = 100) String password
) {
}
