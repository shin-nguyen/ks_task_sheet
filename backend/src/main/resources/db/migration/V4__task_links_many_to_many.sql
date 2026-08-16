CREATE TABLE task_links (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    be_task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    ui_task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (be_task_id, ui_task_id)
);

CREATE INDEX idx_task_links_be_task_id ON task_links(be_task_id);
CREATE INDEX idx_task_links_ui_task_id ON task_links(ui_task_id);

ALTER TABLE tasks DROP COLUMN linked_task_id;
