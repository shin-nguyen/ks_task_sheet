package dev.kstasks.timeline.dto;

import dev.kstasks.timeline.TimelineConfig;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record TimelineConfigResponse(UUID userId, LocalDate startDate, List<String> gapDays) {
    public static TimelineConfigResponse from(TimelineConfig c) {
        return new TimelineConfigResponse(c.getUser().getId(), c.getStartDate(), c.getGapDays());
    }
}
