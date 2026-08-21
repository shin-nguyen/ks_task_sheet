package dev.kstasks.todo.dto;

import dev.kstasks.auth.dto.UserResponse;
import dev.kstasks.todo.EpicTodo;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record TodoResponse(
        UUID id,
        String title,
        UserResponse assignee,
        LocalDate dueDate,
        boolean done,
        UserResponse createdBy,
        Instant createdAt,
        Instant updatedAt
) {
    public static TodoResponse from(EpicTodo t) {
        return new TodoResponse(
                t.getId(),
                t.getTitle(),
                t.getAssignee() != null ? UserResponse.from(t.getAssignee()) : null,
                t.getDueDate(),
                t.isDone(),
                UserResponse.from(t.getCreatedBy()),
                t.getCreatedAt(),
                t.getUpdatedAt()
        );
    }
}
