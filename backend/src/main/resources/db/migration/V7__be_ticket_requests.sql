CREATE TABLE be_ticket_requests (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    epic_id      UUID NOT NULL REFERENCES epics(id) ON DELETE CASCADE,
    ui_task_id   UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    note         TEXT NOT NULL,
    resolved     BOOLEAN NOT NULL DEFAULT false,
    created_by   UUID NOT NULL REFERENCES users(id),
    created_at   TIMESTAMP NOT NULL DEFAULT now(),
    resolved_at  TIMESTAMP
);
CREATE INDEX idx_be_ticket_requests_epic_id ON be_ticket_requests(epic_id);
CREATE INDEX idx_be_ticket_requests_ui_task_id ON be_ticket_requests(ui_task_id);
