-- Create student_availability table
CREATE TABLE public.student_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_level TEXT NOT NULL CHECK (preferred_level IN ('beginner', 'intermediate', 'advanced')),
  preferred_date DATE NOT NULL,
  preferred_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, preferred_date, preferred_time)
);

-- Enable RLS
ALTER TABLE public.student_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_availability
CREATE POLICY "Students can manage their own availability"
ON public.student_availability
FOR ALL
USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view all student availability"
ON public.student_availability
FOR SELECT
USING (has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can update student availability status"
ON public.student_availability
FOR UPDATE
USING (has_role(auth.uid(), 'teacher'));

CREATE POLICY "Admins can manage all student availability"
ON public.student_availability
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_student_availability_updated_at
BEFORE UPDATE ON public.student_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_availability;