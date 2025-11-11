-- Create group_goals table for teacher-created goals
CREATE TABLE group_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  teacher_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  target_value numeric NOT NULL,
  unit text NOT NULL, -- e.g., 'lessons', 'hours', 'assignments', 'points'
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create student_goal_progress table for individual student progress
CREATE TABLE student_goal_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_goal_id uuid REFERENCES group_goals(id) ON DELETE CASCADE NOT NULL,
  student_id uuid NOT NULL,
  personalized_description text, -- AI-generated personalized goal description
  current_value numeric NOT NULL DEFAULT 0,
  target_value numeric NOT NULL,
  progress_percentage numeric GENERATED ALWAYS AS (
    CASE 
      WHEN target_value > 0 THEN LEAST((current_value / target_value * 100), 100)
      ELSE 0
    END
  ) STORED,
  last_updated timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(group_goal_id, student_id)
);

-- Enable RLS
ALTER TABLE group_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_goal_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_goals
CREATE POLICY "Teachers can manage their group goals"
ON group_goals
FOR ALL
USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view their group goals"
ON group_goals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_enrollments
    WHERE group_enrollments.group_id = group_goals.group_id
      AND group_enrollments.student_id = auth.uid()
      AND group_enrollments.status = 'active'
  )
);

CREATE POLICY "Admins can manage all goals"
ON group_goals
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for student_goal_progress
CREATE POLICY "Students can view their own progress"
ON student_goal_progress
FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view progress for their group goals"
ON student_goal_progress
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_goals
    WHERE group_goals.id = student_goal_progress.group_goal_id
      AND group_goals.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can update progress for their students"
ON student_goal_progress
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM group_goals
    WHERE group_goals.id = student_goal_progress.group_goal_id
      AND group_goals.teacher_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all progress"
ON student_goal_progress
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_group_goals_updated_at
BEFORE UPDATE ON group_goals
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_group_goals_group_id ON group_goals(group_id);
CREATE INDEX idx_group_goals_teacher_id ON group_goals(teacher_id);
CREATE INDEX idx_student_goal_progress_student_id ON student_goal_progress(student_id);
CREATE INDEX idx_student_goal_progress_group_goal_id ON student_goal_progress(group_goal_id);