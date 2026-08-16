package dev.kstasks.task.dto;

import dev.kstasks.task.Task;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.UUID;

public record TaskRequest(
        @NotBlank String ticketId,
        @NotBlank String title,
        String description,
        @NotNull Task.Type type,
        String note,
        UUID beAssigneeId,
        UUID uiAssigneeId,
        UUID testAssigneeId,
        @NotNull @DecimalMin("0.0") BigDecimal devEffort,
        @NotNull @DecimalMin("0.0") BigDecimal testEffort,
        @NotNull UUID statusId
) {
}
