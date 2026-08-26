package dev.kstasks.notify;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class NotifyScheduler {

    private final NotifyDispatchService notifyDispatchService;
    private final GitPollingService gitPollingService;

    public NotifyScheduler(NotifyDispatchService notifyDispatchService, GitPollingService gitPollingService) {
        this.notifyDispatchService = notifyDispatchService;
        this.gitPollingService = gitPollingService;
    }

    @Scheduled(fixedRate = 60_000)
    public void meetingReminders() {
        notifyDispatchService.checkMeetingReminders(Instant.now());
    }

    @Scheduled(fixedRate = 60_000)
    public void dailyReports() {
        notifyDispatchService.checkDailyReports(Instant.now());
    }

    @Scheduled(fixedRate = 60_000)
    public void gitPolling() {
        gitPollingService.checkAllDueEpics(Instant.now());
    }
}
