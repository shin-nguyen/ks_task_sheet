CREATE TABLE epic_notify_configs (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    epic_id                     UUID NOT NULL UNIQUE REFERENCES epics(id) ON DELETE CASCADE,
    room_name                   VARCHAR(200) NOT NULL,
    room_id                     VARCHAR(100),
    room_resolved_at            TIMESTAMP,
    meeting_reminder_enabled    BOOLEAN NOT NULL DEFAULT false,
    daily_report_enabled        BOOLEAN NOT NULL DEFAULT false,
    daily_report_time           TIME NOT NULL DEFAULT '09:00:00',
    merge_notify_enabled        BOOLEAN NOT NULL DEFAULT false,
    git_repo_url                VARCHAR(1000),
    git_branch                  VARCHAR(200),
    git_poll_interval_minutes   INT NOT NULL DEFAULT 15,
    updated_by                  UUID REFERENCES users(id),
    created_at                  TIMESTAMP NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_epic_notify_configs_epic_id ON epic_notify_configs(epic_id);

CREATE TABLE epic_notify_state (
    epic_id                 UUID PRIMARY KEY REFERENCES epics(id) ON DELETE CASCADE,
    last_report_sent_date   DATE,
    last_seen_commit_sha    VARCHAR(64),
    last_git_check_at       TIMESTAMP,
    git_clone_status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    git_last_error          TEXT,
    updated_at               TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE epic_meetings ADD COLUMN reminder_sent_at TIMESTAMP;
CREATE INDEX idx_epic_meetings_scheduled_at ON epic_meetings(scheduled_at) WHERE reminder_sent_at IS NULL;

CREATE TABLE notify_global_settings (
    id          SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    enabled     BOOLEAN NOT NULL DEFAULT true,
    updated_by  UUID REFERENCES users(id),
    updated_at  TIMESTAMP NOT NULL DEFAULT now()
);
INSERT INTO notify_global_settings (id, enabled) VALUES (1, true);
