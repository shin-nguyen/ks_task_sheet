ALTER TABLE tasks ADD COLUMN test_assignee_id UUID REFERENCES users(id);
