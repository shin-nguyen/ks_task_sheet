package dev.kstasks.notify;

import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "epic_notify_state")
public class EpicNotifyState {

    public enum GitCloneStatus {
        PENDING, OK, ERROR
    }

    @Id
    @Column(name = "epic_id")
    private UUID epicId;

    @Column(name = "last_report_sent_date")
    private LocalDate lastReportSentDate;

    @Column(name = "last_seen_commit_sha")
    private String lastSeenCommitSha;

    @Column(name = "last_git_check_at")
    private Instant lastGitCheckAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "git_clone_status", nullable = false)
    private GitCloneStatus gitCloneStatus = GitCloneStatus.PENDING;

    @Column(name = "git_last_error", columnDefinition = "TEXT")
    private String gitLastError;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        if (updatedAt == null) {
            updatedAt = Instant.now();
        }
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getEpicId() {
        return epicId;
    }

    public void setEpicId(UUID epicId) {
        this.epicId = epicId;
    }

    public LocalDate getLastReportSentDate() {
        return lastReportSentDate;
    }

    public void setLastReportSentDate(LocalDate lastReportSentDate) {
        this.lastReportSentDate = lastReportSentDate;
    }

    public String getLastSeenCommitSha() {
        return lastSeenCommitSha;
    }

    public void setLastSeenCommitSha(String lastSeenCommitSha) {
        this.lastSeenCommitSha = lastSeenCommitSha;
    }

    public Instant getLastGitCheckAt() {
        return lastGitCheckAt;
    }

    public void setLastGitCheckAt(Instant lastGitCheckAt) {
        this.lastGitCheckAt = lastGitCheckAt;
    }

    public GitCloneStatus getGitCloneStatus() {
        return gitCloneStatus;
    }

    public void setGitCloneStatus(GitCloneStatus gitCloneStatus) {
        this.gitCloneStatus = gitCloneStatus;
    }

    public String getGitLastError() {
        return gitLastError;
    }

    public void setGitLastError(String gitLastError) {
        this.gitLastError = gitLastError;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
