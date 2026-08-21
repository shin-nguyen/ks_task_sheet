CREATE TABLE epic_documents (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    epic_id           UUID NOT NULL REFERENCES epics(id) ON DELETE CASCADE,
    display_name      VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename   VARCHAR(255) NOT NULL UNIQUE,
    content_type      VARCHAR(150) NOT NULL,
    size_bytes        BIGINT NOT NULL,
    uploaded_by       UUID NOT NULL REFERENCES users(id),
    created_at        TIMESTAMP NOT NULL DEFAULT now(),
    updated_at        TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_epic_documents_epic_id ON epic_documents(epic_id);
