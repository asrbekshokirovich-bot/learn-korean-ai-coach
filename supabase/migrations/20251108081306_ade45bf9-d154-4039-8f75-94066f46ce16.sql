-- Allow authenticated users to view teacher profiles (full_name, email)
CREATE POLICY "Students can view teacher profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND has_role(user_id, 'teacher'::app_role)
);
