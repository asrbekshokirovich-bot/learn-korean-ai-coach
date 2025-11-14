-- Add meeting_link column to video_lessons table for Google Meet integration
ALTER TABLE public.video_lessons 
ADD COLUMN IF NOT EXISTS meeting_link TEXT;

-- Add meeting_link column to groups table for group lessons
ALTER TABLE public.groups
ADD COLUMN IF NOT EXISTS meeting_link TEXT;

COMMENT ON COLUMN public.video_lessons.meeting_link IS 'Google Meet link provided by teacher for 1:1 lessons';
COMMENT ON COLUMN public.groups.meeting_link IS 'Google Meet link provided by teacher for group lessons';