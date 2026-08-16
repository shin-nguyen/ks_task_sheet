package dev.kstasks.auth.dto;

import dev.kstasks.auth.User;
import jakarta.validation.constraints.NotNull;

public record UpdateRoleRequest(@NotNull User.Role role) {
}
