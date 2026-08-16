package dev.kstasks.task;

import dev.kstasks.auth.User;
import dev.kstasks.epic.Epic;
import dev.kstasks.status.TaskStatus;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tasks")
public class Task {

    public enum Type {
        BE, UI
    }

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "epic_id", nullable = false)
    private Epic epic;

    @Column(name = "ticket_id", nullable = false)
    private String ticketId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Type type;

    @Column(columnDefinition = "TEXT")
    private String note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "be_assignee_id")
    private User beAssignee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ui_assignee_id")
    private User uiAssignee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_assignee_id")
    private User testAssignee;

    @Column(name = "dev_effort", nullable = false, precision = 4, scale = 1)
    private BigDecimal devEffort = BigDecimal.ZERO;

    @Column(name = "test_effort", nullable = false, precision = 4, scale = 1)
    private BigDecimal testEffort = BigDecimal.ZERO;

    @Column(name = "total_effort", nullable = false, precision = 4, scale = 1)
    private BigDecimal totalEffort = BigDecimal.ZERO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "status_id", nullable = false)
    private TaskStatus status;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

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

    public String getTicketId() {
        return ticketId;
    }

    public void setTicketId(String ticketId) {
        this.ticketId = ticketId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Type getType() {
        return type;
    }

    public void setType(Type type) {
        this.type = type;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public User getBeAssignee() {
        return beAssignee;
    }

    public void setBeAssignee(User beAssignee) {
        this.beAssignee = beAssignee;
    }

    public User getUiAssignee() {
        return uiAssignee;
    }

    public void setUiAssignee(User uiAssignee) {
        this.uiAssignee = uiAssignee;
    }

    public User getTestAssignee() {
        return testAssignee;
    }

    public void setTestAssignee(User testAssignee) {
        this.testAssignee = testAssignee;
    }

    public BigDecimal getDevEffort() {
        return devEffort;
    }

    public void setDevEffort(BigDecimal devEffort) {
        this.devEffort = devEffort;
    }

    public BigDecimal getTestEffort() {
        return testEffort;
    }

    public void setTestEffort(BigDecimal testEffort) {
        this.testEffort = testEffort;
    }

    public BigDecimal getTotalEffort() {
        return totalEffort;
    }

    public void setTotalEffort(BigDecimal totalEffort) {
        this.totalEffort = totalEffort;
    }

    public TaskStatus getStatus() {
        return status;
    }

    public void setStatus(TaskStatus status) {
        this.status = status;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
