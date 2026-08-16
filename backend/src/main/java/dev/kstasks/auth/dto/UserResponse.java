package dev.kstasks.auth.dto;

import dev.kstasks.auth.User;

import java.util.UUID;

public record UserResponse(UUID id, String email, String name, User.Role role) {
    public static UserResponse from(User u) {
        return new UserResponse(u.getId(), u.getEmail(), u.getName(), u.getRole());
    }
}
