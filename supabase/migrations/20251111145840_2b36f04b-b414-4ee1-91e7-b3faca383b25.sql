-- Create demo_lessons table if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'demo_lessons') THEN
    CREATE TABLE demo_lessons (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid NOT NULL,
      coordinator_id uuid NOT NULL,
      scheduled_at timestamp with time zone NOT NULL,
      status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
      detected_level text,
      ai_recommendations jsonb,
      coordinator_notes text,
      completed_at timestamp with time zone,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    );
  END IF;
END
$$;

-- Add group_level_analysis column to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS group_level_analysis jsonb;

-- Enable RLS on demo_lessons
ALTER TABLE demo_lessons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Coordinators can manage demo lessons" ON demo_lessons;
CREATE POLICY "Coordinators can manage demo lessons"
ON demo_lessons
FOR ALL
USING (
  auth.uid() = coordinator_id 
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Students can view their own demo lessons" ON demo_lessons;
CREATE POLICY "Students can view their own demo lessons"
ON demo_lessons
FOR SELECT
USING (auth.uid() = student_id);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_demo_lessons_student_id ON demo_lessons(student_id);
CREATE INDEX IF NOT EXISTS idx_demo_lessons_coordinator_id ON demo_lessons(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_demo_lessons_status ON demo_lessons(status);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_demo_lessons_updated_at ON demo_lessons;
CREATE TRIGGER update_demo_lessons_updated_at
BEFORE UPDATE ON demo_lessons
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();