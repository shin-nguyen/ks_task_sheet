ALTER TABLE epic_notes ADD COLUMN updated_by_id UUID REFERENCES users(id);
UPDATE epic_notes SET updated_by_id = author_id WHERE updated_by_id IS NULL;
ALTER TABLE epic_notes ALTER COLUMN updated_by_id SET NOT NULL;
