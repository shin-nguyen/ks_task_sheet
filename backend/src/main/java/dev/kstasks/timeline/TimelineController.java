package dev.kstasks.timeline;

import dev.kstasks.auth.User;
import dev.kstasks.auth.UserRepository;
import dev.kstasks.common.ApiException;
import dev.kstasks.epic.EpicAccessService;
import dev.kstasks.epic.EpicRepository;
import dev.kstasks.timeline.dto.TimelineConfigRequest;
import dev.kstasks.timeline.dto.TimelineConfigResponse;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/epics/{epicId}/timeline-configs")
@Transactional
public class TimelineController {

    private final TimelineConfigRepository configRepository;
    private final EpicRepository epicRepository;
    private final UserRepository userRepository;
    private final EpicAccessService epicAccessService;

    public TimelineController(TimelineConfigRepository configRepository, EpicRepository epicRepository,
                               UserRepository userRepository, EpicAccessService epicAccessService) {
        this.configRepository = configRepository;
        this.epicRepository = epicRepository;
        this.userRepository = userRepository;
        this.epicAccessService = epicAccessService;
    }

    @GetMapping
    public List<TimelineConfigResponse> list(@PathVariable UUID epicId) {
        epicAccessService.assertAccess(epicId);
        return configRepository.findAllByEpicId(epicId).stream().map(TimelineConfigResponse::from).toList();
    }

    @PutMapping("/{userId}")
    @Transactional
    public TimelineConfigResponse upsert(@PathVariable UUID epicId, @PathVariable UUID userId,
                                          @Valid @RequestBody TimelineConfigRequest req) {
        epicAccessService.assertAccess(epicId);
        var epic = epicRepository.findById(epicId).orElseThrow(() -> ApiException.notFound("Epic not found"));
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("User not found"));

        TimelineConfig config = configRepository.findByEpicIdAndUserId(epicId, userId).orElseGet(() -> {
            TimelineConfig c = new TimelineConfig();
            c.setEpic(epic);
            c.setUser(user);
            return c;
        });
        config.setStartDate(req.startDate());
        config.setGapDays(req.gapDays() != null ? req.gapDays() : List.of());
        return TimelineConfigResponse.from(configRepository.save(config));
    }
}
