package dev.kstasks.notify;

import dev.kstasks.epic.Epic;
import dev.kstasks.meeting.EpicMeeting;
import dev.kstasks.meeting.EpicMeetingRepository;
import dev.kstasks.notify.client.RocketChatClient;
import dev.kstasks.task.Task;
import dev.kstasks.task.TaskRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class NotifyDispatchService {

    private static final Logger log = LoggerFactory.getLogger(NotifyDispatchService.class);
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm").withZone(ZoneOffset.UTC);

    private final NotifyGlobalSettingsRepository globalSettingsRepository;
    private final RocketChatClient rocketChatClient;
    private final EpicMeetingRepository meetingRepository;
    private final EpicNotifyConfigRepository notifyConfigRepository;
    private final EpicNotifyStateRepository notifyStateRepository;
    private final TaskRepository taskRepository;

    public NotifyDispatchService(NotifyGlobalSettingsRepository globalSettingsRepository, RocketChatClient rocketChatClient,
                                  EpicMeetingRepository meetingRepository, EpicNotifyConfigRepository notifyConfigRepository,
                                  EpicNotifyStateRepository notifyStateRepository, TaskRepository taskRepository) {
        this.globalSettingsRepository = globalSettingsRepository;
        this.rocketChatClient = rocketChatClient;
        this.meetingRepository = meetingRepository;
        this.notifyConfigRepository = notifyConfigRepository;
        this.notifyStateRepository = notifyStateRepository;
        this.taskRepository = taskRepository;
    }

    public void sendToEpicRoom(EpicNotifyConfig config, String message) {
        NotifyGlobalSettings settings = globalSettingsRepository.findById((short) 1).orElse(null);
        if (settings == null || !settings.isEnabled() || config.getRoomId() == null) {
            return;
        }
        try {
            rocketChatClient.sendMessage(config.getRoomId(), message);
        } catch (Exception e) {
            log.warn("Failed to send Rocket.Chat notification for epic {}: {}", config.getEpic().getId(), e.getMessage());
        }
    }

    public void checkMeetingReminders(Instant now) {
        Instant windowEnd = now.plus(15, ChronoUnit.MINUTES);
        List<EpicMeeting> due = meetingRepository.findAllByReminderSentAtIsNullAndScheduledAtBetween(now, windowEnd);
        for (EpicMeeting meeting : due) {
            EpicNotifyConfig config = notifyConfigRepository.findByEpicId(meeting.getEpic().getId()).orElse(null);
            if (config != null && config.isMeetingReminderEnabled() && config.getRoomId() != null) {
                sendToEpicRoom(config, buildMeetingReminderMessage(meeting));
            }
            meeting.setReminderSentAt(now);
            meetingRepository.save(meeting);
        }
    }

    public void checkDailyReports(Instant now) {
        LocalDate today = LocalDate.ofInstant(now, ZoneOffset.UTC);
        DayOfWeek dayOfWeek = today.getDayOfWeek();
        if (dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY) {
            return;
        }
        LocalTime nowTime = now.atZone(ZoneOffset.UTC).toLocalTime();

        for (EpicNotifyConfig config : notifyConfigRepository.findAllByDailyReportEnabledTrue()) {
            var epic = config.getEpic();
            EpicNotifyState state = notifyStateRepository.findById(epic.getId()).orElse(null);
            if (state != null && today.equals(state.getLastReportSentDate())) {
                continue;
            }
            if (nowTime.isBefore(config.getDailyReportTime())) {
                continue;
            }

            List<Task> tasks = taskRepository.findAllByEpicIdOrderBySortOrderAsc(epic.getId());
            sendToEpicRoom(config, buildDailyReportMessage(epic, tasks));

            if (state == null) {
                state = new EpicNotifyState();
                state.setEpicId(epic.getId());
            }
            state.setLastReportSentDate(today);
            notifyStateRepository.save(state);
        }
    }

    private String buildMeetingReminderMessage(EpicMeeting meeting) {
        StringBuilder sb = new StringBuilder("*[Meeting Reminder]* \"")
                .append(meeting.getTitle())
                .append("\" starts at ")
                .append(TIME_FORMAT.format(meeting.getScheduledAt()))
                .append(" UTC");
        if (meeting.getLink() != null && !meeting.getLink().isBlank()) {
            sb.append("\nLink: ").append(meeting.getLink());
        }
        return sb.toString();
    }

    private String buildDailyReportMessage(Epic epic, List<Task> tasks) {
        StringBuilder sb = new StringBuilder("*[Daily Report]* ")
                .append(epic.getTicketId())
                .append(" - ")
                .append(epic.getName())
                .append("\n")
                .append(statusCountsLine("BE", tasks, Task.Type.BE))
                .append("\n")
                .append(statusCountsLine("UI", tasks, Task.Type.UI));
        return sb.toString();
    }

    private String statusCountsLine(String label, List<Task> tasks, Task.Type type) {
        Map<String, Long> counts = tasks.stream()
                .filter(t -> t.getType() == type)
                .collect(Collectors.groupingBy(t -> t.getStatus().getName(), LinkedHashMap::new, Collectors.counting()));
        String summary = counts.isEmpty()
                ? "no tasks"
                : counts.entrySet().stream().map(e -> e.getKey() + ": " + e.getValue()).collect(Collectors.joining(", "));
        return label + " - " + summary;
    }
}
