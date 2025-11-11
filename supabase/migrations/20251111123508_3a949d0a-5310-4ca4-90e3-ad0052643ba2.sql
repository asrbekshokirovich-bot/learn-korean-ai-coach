-- Create storage bucket for chat files
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', false);

-- Add file fields to group_messages
ALTER TABLE public.group_messages
ADD COLUMN file_url TEXT,
ADD COLUMN file_name TEXT,
ADD COLUMN file_type TEXT,
ADD COLUMN file_size INTEGER;

-- Add file fields to group_direct_messages
ALTER TABLE public.group_direct_messages
ADD COLUMN file_url TEXT,
ADD COLUMN file_name TEXT,
ADD COLUMN file_type TEXT,
ADD COLUMN file_size INTEGER;

-- Storage policies for chat-files bucket
CREATE POLICY "Group members can view chat files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'chat-files'
  AND (
    -- Allow if user is in the group (extract group_id from path)
    EXISTS (
      SELECT 1 FROM public.group_enrollments
      WHERE group_enrollments.student_id = auth.uid()
      AND group_enrollments.group_id::text = split_part(name, '/', 1)
    )
    OR EXISTS (
      SELECT 1 FROM public.groups
      WHERE groups.teacher_id = auth.uid()
      AND groups.id::text = split_part(name, '/', 1)
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Group members can upload chat files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'chat-files'
  AND (
    EXISTS (
      SELECT 1 FROM public.group_enrollments
      WHERE group_enrollments.student_id = auth.uid()
      AND group_enrollments.group_id::text = split_part(name, '/', 1)
    )
    OR EXISTS (
      SELECT 1 FROM public.groups
      WHERE groups.teacher_id = auth.uid()
      AND groups.id::text = split_part(name, '/', 1)
    )
  )
);

CREATE POLICY "Users can delete their own chat files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'chat-files'
  AND auth.uid()::text = split_part(name, '/', 2)
);

CREATE POLICY "Admins can manage all chat files"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'chat-files'
  AND has_role(auth.uid(), 'admin'::app_role)
);