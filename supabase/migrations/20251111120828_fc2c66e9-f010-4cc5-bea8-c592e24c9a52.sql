-- Create storage bucket for cheque files
INSERT INTO storage.buckets (id, name, public)
VALUES ('cheque-files', 'cheque-files', false);

-- Add cheque_file_path column to finance_records
ALTER TABLE finance_records
ADD COLUMN cheque_file_path TEXT;

-- RLS policies for cheque-files bucket
CREATE POLICY "Admins can upload cheque files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cheque-files' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can view cheque files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'cheque-files' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete cheque files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'cheque-files' AND
  has_role(auth.uid(), 'admin'::app_role)
);