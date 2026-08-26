package dev.kstasks.notify;

import dev.kstasks.auth.User;
import dev.kstasks.epic.Epic;
import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "epic_notify_configs")
public class EpicNotifyConfig {

    @Id
    @GeneratedValue
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "epic_id", nullable = false, unique = true)
    private Epic epic;

    @Column(name = "room_name", nullable = false)
    private String roomName;

    @Column(name = "room_id")
    private String roomId;

    @Column(name = "room_resolved_at")
    private Instant roomResolvedAt;

    @Column(name = "meeting_reminder_enabled", nullable = false)
    private boolean meetingReminderEnabled;

    @Column(name = "daily_report_enabled", nullable = false)
    private boolean dailyReportEnabled;

    @Column(name = "daily_report_time", nullable = false)
    private LocalTime dailyReportTime = LocalTime.of(9, 0);

    @Column(name = "merge_notify_enabled", nullable = false)
    private boolean mergeNotifyEnabled;

    @Column(name = "git_repo_url")
    private String gitRepoUrl;

    @Column(name = "git_branch")
    private String gitBranch;

    @Column(name = "git_poll_interval_minutes", nullable = false)
    private int gitPollIntervalMinutes = 15;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Epic getEpic() {
        return epic;
    }

    public void setEpic(Epic epic) {
        this.epic = epic;
    }

    public String getRoomName() {
        return roomName;
    }

    public void setRoomName(String roomName) {
        this.roomName = roomName;
    }

    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public Instant getRoomResolvedAt() {
        return roomResolvedAt;
    }

    public void setRoomResolvedAt(Instant roomResolvedAt) {
        this.roomResolvedAt = roomResolvedAt;
    }

    public boolean isMeetingReminderEnabled() {
        return meetingReminderEnabled;
    }

    public void setMeetingReminderEnabled(boolean meetingReminderEnabled) {
        this.meetingReminderEnabled = meetingReminderEnabled;
    }

    public boolean isDailyReportEnabled() {
        return dailyReportEnabled;
    }

    public void setDailyReportEnabled(boolean dailyReportEnabled) {
        this.dailyReportEnabled = dailyReportEnabled;
    }

    public LocalTime getDailyReportTime() {
        return dailyReportTime;
    }

    public void setDailyReportTime(LocalTime dailyReportTime) {
        this.dailyReportTime = dailyReportTime;
    }

    public boolean isMergeNotifyEnabled() {
        return mergeNotifyEnabled;
    }

    public void setMergeNotifyEnabled(boolean mergeNotifyEnabled) {
        this.mergeNotifyEnabled = mergeNotifyEnabled;
    }

    public String getGitRepoUrl() {
        return gitRepoUrl;
    }

    public void setGitRepoUrl(String gitRepoUrl) {
        this.gitRepoUrl = gitRepoUrl;
    }

    public String getGitBranch() {
        return gitBranch;
    }

    public void setGitBranch(String gitBranch) {
        this.gitBranch = gitBranch;
    }

    public int getGitPollIntervalMinutes() {
        return gitPollIntervalMinutes;
    }

    public void setGitPollIntervalMinutes(int gitPollIntervalMinutes) {
        this.gitPollIntervalMinutes = gitPollIntervalMinutes;
    }

    public User getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(User updatedBy) {
        this.updatedBy = updatedBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
