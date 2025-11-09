-- Add video lesson support to existing lessons table
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_video_lesson boolean DEFAULT false;

-- Create video_lessons table for tracking video sessions
CREATE TABLE IF NOT EXISTS video_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL,
  student_id uuid NOT NULL,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
  ai_transcript jsonb DEFAULT '[]'::jsonb,
  ai_insights jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE video_lessons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_lessons
CREATE POLICY "Students can view their own video lessons"
ON video_lessons FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view their video lessons"
ON video_lessons FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "Admins can view all video lessons"
ON video_lessons FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can update their video lesson status"
ON video_lessons FOR UPDATE
USING (auth.uid() = student_id);

CREATE POLICY "Teachers can update their video lesson status"
ON video_lessons FOR UPDATE
USING (auth.uid() = teacher_id);

CREATE POLICY "System can insert video lessons"
ON video_lessons FOR INSERT
WITH CHECK (auth.uid() = student_id OR auth.uid() = teacher_id);

-- Add trigger for updated_at
CREATE TRIGGER update_video_lessons_updated_at
BEFORE UPDATE ON video_lessons
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for video_lessons
ALTER PUBLICATION supabase_realtime ADD TABLE video_lessons;