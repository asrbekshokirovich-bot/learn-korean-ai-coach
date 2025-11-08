-- Add level column to teacher_availability
ALTER TABLE teacher_availability 
ADD COLUMN level text NOT NULL DEFAULT 'beginner';

-- Add check constraint for valid levels
ALTER TABLE teacher_availability 
ADD CONSTRAINT valid_level CHECK (level IN ('beginner', 'intermediate', 'advanced'));