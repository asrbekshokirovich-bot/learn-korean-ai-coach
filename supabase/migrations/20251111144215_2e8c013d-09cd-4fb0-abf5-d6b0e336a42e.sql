-- Add attachment field to homework_assignments
ALTER TABLE homework_assignments
ADD COLUMN attachment_url TEXT,
ADD COLUMN attachment_name TEXT,
ADD COLUMN attachment_size INTEGER;

-- Create homework-files storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('homework-files', 'homework-files', false);

-- Allow teachers to upload homework files
CREATE POLICY "Teachers can upload homework files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'homework-files' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow teachers to view their uploaded files
CREATE POLICY "Teachers can view their homework files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'homework-files'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow students to view homework files assigned to them
CREATE POLICY "Students can view assigned homework files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'homework-files'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM homework_assignments
    WHERE homework_assignments.attachment_url = storage.objects.name
      AND homework_assignments.student_id = auth.uid()
  )
);