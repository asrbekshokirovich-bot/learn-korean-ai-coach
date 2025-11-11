-- Add group_id column to lessons table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'lessons' 
                 AND column_name = 'group_id') THEN
    ALTER TABLE lessons ADD COLUMN group_id uuid REFERENCES groups(id);
    CREATE INDEX idx_lessons_group_id ON lessons(group_id);
  END IF;
END $$;