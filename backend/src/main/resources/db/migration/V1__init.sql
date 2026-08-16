CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) NOT NULL UNIQUE,
    name        VARCHAR(120) NOT NULL,
    password    VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE epics (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id   VARCHAR(60) NOT NULL,
    name        VARCHAR(255) NOT NULL,
    created_by  UUID REFERENCES users(id),
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE task_statuses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(60) NOT NULL UNIQUE,
    color       VARCHAR(20) NOT NULL DEFAULT '#94A3A8',
    category    VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | DONE
    sort_order  INT NOT NULL,
    is_system   BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    epic_id         UUID NOT NULL REFERENCES epics(id) ON DELETE CASCADE,
    ticket_id       VARCHAR(60) NOT NULL,
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    type            VARCHAR(10) NOT NULL, -- BE | UI
    note            TEXT,
    be_assignee_id  UUID REFERENCES users(id),
    ui_assignee_id  UUID REFERENCES users(id),
    dev_effort      NUMERIC(4,1) NOT NULL DEFAULT 0,
    test_effort     NUMERIC(4,1) NOT NULL DEFAULT 0,
    total_effort    NUMERIC(4,1) NOT NULL DEFAULT 0,
    linked_task_id  UUID UNIQUE REFERENCES tasks(id),
    status_id       UUID NOT NULL REFERENCES task_statuses(id),
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT chk_task_type CHECK (type IN ('BE', 'UI'))
);

CREATE INDEX idx_tasks_epic_id ON tasks(epic_id);
CREATE INDEX idx_tasks_status_id ON tasks(status_id);

CREATE TABLE epic_notes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    epic_id     UUID NOT NULL REFERENCES epics(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    author_id   UUID NOT NULL REFERENCES users(id),
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_epic_notes_epic_id ON epic_notes(epic_id);

CREATE TABLE timeline_configs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    epic_id     UUID NOT NULL REFERENCES epics(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date  DATE NOT NULL,
    gap_days    JSONB NOT NULL DEFAULT '[]'::jsonb,
    UNIQUE (epic_id, user_id)
);
