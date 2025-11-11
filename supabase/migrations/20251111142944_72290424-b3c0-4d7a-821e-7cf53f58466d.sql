-- Drop the existing delete policy that allows teachers to delete
DROP POLICY IF EXISTS "Teachers can delete their recordings" ON lesson_recordings;

-- Create new policy that only allows admins to delete
CREATE POLICY "Only admins can delete recordings" 
ON lesson_recordings 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));