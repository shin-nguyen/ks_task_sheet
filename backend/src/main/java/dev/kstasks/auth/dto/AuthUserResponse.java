package dev.kstasks.auth.dto;

import dev.kstasks.auth.User;

import java.util.UUID;

public record AuthUserResponse(UUID id, String email, String name, User.Role role, boolean mustChangePassword) {
    public static AuthUserResponse from(User u) {
        return new AuthUserResponse(u.getId(), u.getEmail(), u.getName(), u.getRole(), u.isMustChangePassword());
    }
}
