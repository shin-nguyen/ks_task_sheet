package dev.kstasks.timeline.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record TimelineConfigRequest(
        @NotNull LocalDate startDate,
        List<LocalDate> gapDays
) {
}
