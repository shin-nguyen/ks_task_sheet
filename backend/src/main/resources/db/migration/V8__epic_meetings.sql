CREATE TABLE epic_meetings (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    epic_id       UUID NOT NULL REFERENCES epics(id) ON DELETE CASCADE,
    title         VARCHAR(500) NOT NULL,
    scheduled_at  TIMESTAMP NOT NULL,
    link          VARCHAR(1000),
    agenda        TEXT,
    minutes       TEXT,
    created_by    UUID NOT NULL REFERENCES users(id),
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_epic_meetings_epic_id ON epic_meetings(epic_id);
