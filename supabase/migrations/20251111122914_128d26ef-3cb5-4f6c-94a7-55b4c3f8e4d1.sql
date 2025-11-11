-- Create groups table
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  description TEXT,
  max_students INTEGER NOT NULL DEFAULT 18,
  current_students_count INTEGER NOT NULL DEFAULT 0,
  teacher_id UUID,
  day_of_week INTEGER NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 90,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group_enrollments table to track students in groups
CREATE TABLE public.group_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active',
  UNIQUE(group_id, student_id)
);

-- Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_enrollments ENABLE ROW LEVEL SECURITY;

-- Policies for groups
CREATE POLICY "Admins can manage all groups"
ON public.groups
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view groups they teach"
ON public.groups
FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view active groups"
ON public.groups
FOR SELECT
USING (status = 'active');

-- Policies for group_enrollments
CREATE POLICY "Admins can manage all enrollments"
ON public.group_enrollments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can view their own enrollments"
ON public.group_enrollments
FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view enrollments for their groups"
ON public.group_enrollments
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.groups
  WHERE groups.id = group_enrollments.group_id
  AND groups.teacher_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();