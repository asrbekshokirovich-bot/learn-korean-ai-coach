-- Allow students to view teacher roles (so they can see who is a teacher when booking)
CREATE POLICY "Students can view teacher roles"
ON public.user_roles
FOR SELECT
USING (role = 'teacher'::app_role);