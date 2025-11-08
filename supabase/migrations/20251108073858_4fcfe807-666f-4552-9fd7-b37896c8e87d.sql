-- Make enrollment_id nullable in lessons table to support individual lesson booking
ALTER TABLE lessons ALTER COLUMN enrollment_id DROP NOT NULL;

-- Add student_id to lessons table for direct student-lesson relationship
ALTER TABLE lessons ADD COLUMN student_id uuid REFERENCES auth.users(id);

-- Add price_usd to lessons table for individual lesson pricing
ALTER TABLE lessons ADD COLUMN price_usd numeric DEFAULT 0;

-- Update RLS policies for lessons to allow students to book
DROP POLICY IF EXISTS "Students can view their own lessons" ON lessons;
CREATE POLICY "Students can view their own lessons" 
ON lessons FOR SELECT 
USING (
  auth.uid() = student_id OR 
  EXISTS (
    SELECT 1 FROM enrollments 
    WHERE enrollments.id = lessons.enrollment_id 
    AND enrollments.student_id = auth.uid()
  )
);

-- Allow students to insert lessons (book lessons)
CREATE POLICY "Students can book lessons" 
ON lessons FOR INSERT 
WITH CHECK (auth.uid() = student_id);

-- Allow teachers to update lesson details
DROP POLICY IF EXISTS "Teachers can view their assigned lessons" ON lessons;
CREATE POLICY "Teachers can manage their lessons" 
ON lessons FOR ALL
USING (auth.uid() = teacher_id);