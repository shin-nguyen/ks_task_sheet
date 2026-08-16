package dev.kstasks.task;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "task_links")
public class TaskLink {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "be_task_id", nullable = false)
    private Task beTask;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ui_task_id", nullable = false)
    private Task uiTask;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Task getBeTask() {
        return beTask;
    }

    public void setBeTask(Task beTask) {
        this.beTask = beTask;
    }

    public Task getUiTask() {
        return uiTask;
    }

    public void setUiTask(Task uiTask) {
        this.uiTask = uiTask;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
