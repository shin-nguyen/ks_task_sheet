CREATE TABLE epic_todos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    epic_id     UUID NOT NULL REFERENCES epics(id) ON DELETE CASCADE,
    title       VARCHAR(500) NOT NULL,
    assignee_id UUID REFERENCES users(id),
    due_date    DATE,
    done        BOOLEAN NOT NULL DEFAULT false,
    created_by  UUID NOT NULL REFERENCES users(id),
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_epic_todos_epic_id ON epic_todos(epic_id);
