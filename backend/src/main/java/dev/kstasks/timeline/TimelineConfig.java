package dev.kstasks.timeline;

import dev.kstasks.auth.User;
import dev.kstasks.epic.Epic;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "timeline_configs")
public class TimelineConfig {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "epic_id", nullable = false)
    private Epic epic;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    // Each entry is "YYYY-MM-DD" (whole day busy) or "YYYY-MM-DD:AM" / "YYYY-MM-DD:PM" (half day busy).
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "gap_days", nullable = false, columnDefinition = "jsonb")
    private List<String> gapDays = new ArrayList<>();

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

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public List<String> getGapDays() {
        return gapDays;
    }

    public void setGapDays(List<String> gapDays) {
        this.gapDays = gapDays;
    }
}
