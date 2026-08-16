ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'MEMBER';

CREATE TABLE epic_members (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    epic_id    UUID NOT NULL REFERENCES epics(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    added_at   TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (epic_id, user_id)
);

CREATE INDEX idx_epic_members_user_id ON epic_members(user_id);
