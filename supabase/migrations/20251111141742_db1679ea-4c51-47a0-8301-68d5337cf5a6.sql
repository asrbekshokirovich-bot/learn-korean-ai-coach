-- Create storage bucket for lesson recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-recordings', 'lesson-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Create table for lesson recordings metadata
CREATE TABLE IF NOT EXISTS lesson_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  lesson_date DATE NOT NULL,
  recording_url TEXT NOT NULL,
  duration_seconds INTEGER,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID NOT NULL,
  title TEXT,
  thumbnail_url TEXT
);

-- Enable RLS
ALTER TABLE lesson_recordings ENABLE ROW LEVEL SECURITY;

-- Policies for lesson recordings
CREATE POLICY "Group members can view recordings"
  ON lesson_recordings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_enrollments
      WHERE group_enrollments.group_id = lesson_recordings.group_id
      AND group_enrollments.student_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = lesson_recordings.group_id
      AND groups.teacher_id = auth.uid()
    )
    OR
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Teachers can insert recordings"
  ON lesson_recordings FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND (
      EXISTS (
        SELECT 1 FROM groups
        WHERE groups.id = lesson_recordings.group_id
        AND groups.teacher_id = auth.uid()
      )
      OR
      has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Teachers can delete their recordings"
  ON lesson_recordings FOR DELETE
  USING (
    auth.uid() = created_by
    OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Storage policies for lesson recordings
CREATE POLICY "Group members can view recordings"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'lesson-recordings'
    AND (
      EXISTS (
        SELECT 1 FROM lesson_recordings
        JOIN group_enrollments ON group_enrollments.group_id = lesson_recordings.group_id
        WHERE lesson_recordings.recording_url = storage.objects.name
        AND group_enrollments.student_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM lesson_recordings
        JOIN groups ON groups.id = lesson_recordings.group_id
        WHERE lesson_recordings.recording_url = storage.objects.name
        AND groups.teacher_id = auth.uid()
      )
      OR
      has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Teachers can upload recordings"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'lesson-recordings'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Teachers can delete their recordings"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'lesson-recordings'
    AND auth.role() = 'authenticated'
  );