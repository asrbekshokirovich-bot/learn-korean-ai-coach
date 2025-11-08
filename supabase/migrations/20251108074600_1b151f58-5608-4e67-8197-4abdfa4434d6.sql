-- Create conversation recordings table
CREATE TABLE conversation_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES auth.users(id) NOT NULL,
  recording_date date NOT NULL,
  audio_segments jsonb NOT NULL DEFAULT '[]'::jsonb,
  transcription text,
  duration_seconds integer DEFAULT 0,
  status text NOT NULL DEFAULT 'recording', -- recording, processing, completed
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create conversation analysis table
CREATE TABLE conversation_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id uuid REFERENCES conversation_recordings(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES auth.users(id) NOT NULL,
  analysis_date date NOT NULL,
  topics_discussed jsonb NOT NULL DEFAULT '[]'::jsonb,
  struggle_areas jsonb NOT NULL DEFAULT '[]'::jsonb,
  vocabulary_gaps jsonb NOT NULL DEFAULT '[]'::jsonb,
  grammar_issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence_score integer,
  ai_recommendations text,
  practice_suggestions jsonb NOT NULL DEFAULT '[]'::jsonb,
  shared_with_teacher boolean DEFAULT false,
  teacher_report text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE conversation_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversation_recordings
CREATE POLICY "Students can view their own recordings"
ON conversation_recordings FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own recordings"
ON conversation_recordings FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own recordings"
ON conversation_recordings FOR UPDATE
USING (auth.uid() = student_id);

CREATE POLICY "Admins can manage all recordings"
ON conversation_recordings FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for conversation_analysis
CREATE POLICY "Students can view their own analysis"
ON conversation_analysis FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own analysis"
ON conversation_analysis FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own analysis"
ON conversation_analysis FOR UPDATE
USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view shared analysis"
ON conversation_analysis FOR SELECT
USING (
  shared_with_teacher = true AND 
  EXISTS (
    SELECT 1 FROM lessons 
    WHERE lessons.student_id = conversation_analysis.student_id 
    AND lessons.teacher_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all analysis"
ON conversation_analysis FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_conversation_recordings_updated_at
BEFORE UPDATE ON conversation_recordings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversation_analysis_updated_at
BEFORE UPDATE ON conversation_analysis
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();