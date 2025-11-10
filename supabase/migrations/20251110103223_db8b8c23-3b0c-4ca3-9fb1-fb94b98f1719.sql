-- Add teacher_levels column to profiles table
ALTER TABLE public.profiles
ADD COLUMN teacher_levels text[] DEFAULT '{}';

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.teacher_levels IS 'Array of teaching levels a teacher can teach (beginner, intermediate, advanced)';
