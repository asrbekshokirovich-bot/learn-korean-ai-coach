-- Fix infinite recursion in lessons RLS policies
-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Students can view their own lessons" ON public.lessons;
DROP POLICY IF EXISTS "Teachers can manage their lessons" ON public.lessons;
DROP POLICY IF EXISTS "Admins can manage all lessons" ON public.lessons;

-- Recreate the policies without infinite recursion
CREATE POLICY "Students can view their own lessons" 
ON public.lessons 
FOR SELECT 
USING (
  auth.uid() = student_id OR 
  (enrollment_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM enrollments 
    WHERE enrollments.id = lessons.enrollment_id 
    AND enrollments.student_id = auth.uid()
  ))
);

CREATE POLICY "Teachers can manage their lessons" 
ON public.lessons 
FOR ALL 
USING (auth.uid() = teacher_id);

CREATE POLICY "Admins can manage all lessons" 
ON public.lessons 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));