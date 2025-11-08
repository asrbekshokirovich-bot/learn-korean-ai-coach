-- Create courses table (TOPIK CLUB packages)
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  course_type TEXT NOT NULL CHECK (course_type IN ('private_lesson', 'group_class', 'monthly_unlimited', 'bootcamp', 'free_trial')),
  format TEXT NOT NULL CHECK (format IN ('1-on-1', 'group', 'hybrid')),
  duration_weeks INTEGER,
  sessions_count INTEGER,
  price_usd DECIMAL(10,2) NOT NULL,
  teacher_payout_percentage DECIMAL(5,2) DEFAULT 70.00,
  max_students INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create enrollments table
CREATE TABLE public.enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrollment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_amount DECIMAL(10,2) NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lessons table (scheduled sessions)
CREATE TABLE public.lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 50,
  lesson_type TEXT NOT NULL CHECK (lesson_type IN ('private', 'group', 'trial')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  meeting_link TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lesson_reviews table (AI scoring + student feedback)
CREATE TABLE public.lesson_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100),
  ai_feedback JSONB,
  student_rating INTEGER CHECK (student_rating >= 1 AND student_rating <= 5),
  student_comment TEXT,
  engagement_score INTEGER,
  pacing_score INTEGER,
  error_correction_score INTEGER,
  cultural_accuracy_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create homework_assignments table
CREATE TABLE public.homework_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'submitted', 'graded')),
  submission_text TEXT,
  submission_url TEXT,
  ai_grade INTEGER CHECK (ai_grade >= 0 AND ai_grade <= 100),
  teacher_grade INTEGER CHECK (teacher_grade >= 0 AND teacher_grade <= 100),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create teacher_availability table
CREATE TABLE public.teacher_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  amount_usd DECIMAL(10,2) NOT NULL,
  payment_method TEXT,
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create teacher_payouts table
CREATE TABLE public.teacher_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_revenue DECIMAL(10,2) NOT NULL,
  payout_amount DECIMAL(10,2) NOT NULL,
  payout_percentage DECIMAL(5,2) NOT NULL,
  lessons_count INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for courses
CREATE POLICY "Anyone can view active courses" ON public.courses FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage courses" ON public.courses FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for enrollments
CREATE POLICY "Students can view their own enrollments" ON public.enrollments FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Teachers can view enrollments for their lessons" ON public.enrollments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.lessons WHERE lessons.enrollment_id = enrollments.id AND lessons.teacher_id = auth.uid())
);
CREATE POLICY "Admins can manage all enrollments" ON public.enrollments FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for lessons
CREATE POLICY "Students can view their own lessons" ON public.lessons FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.enrollments WHERE enrollments.id = lessons.enrollment_id AND enrollments.student_id = auth.uid())
);
CREATE POLICY "Teachers can view their assigned lessons" ON public.lessons FOR SELECT USING (auth.uid() = teacher_id);
CREATE POLICY "Admins can manage all lessons" ON public.lessons FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for lesson_reviews
CREATE POLICY "Students can view their own reviews" ON public.lesson_reviews FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students can insert their own reviews" ON public.lesson_reviews FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Teachers can view reviews for their lessons" ON public.lesson_reviews FOR SELECT USING (auth.uid() = teacher_id);
CREATE POLICY "Admins can manage all reviews" ON public.lesson_reviews FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for homework_assignments
CREATE POLICY "Students can view their own homework" ON public.homework_assignments FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students can update their submissions" ON public.homework_assignments FOR UPDATE USING (auth.uid() = student_id);
CREATE POLICY "Teachers can manage homework for their students" ON public.homework_assignments FOR ALL USING (auth.uid() = teacher_id);
CREATE POLICY "Admins can manage all homework" ON public.homework_assignments FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for teacher_availability
CREATE POLICY "Anyone can view teacher availability" ON public.teacher_availability FOR SELECT USING (true);
CREATE POLICY "Teachers can manage their own availability" ON public.teacher_availability FOR ALL USING (auth.uid() = teacher_id);
CREATE POLICY "Admins can manage all availability" ON public.teacher_availability FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for payments
CREATE POLICY "Students can view their own payments" ON public.payments FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Admins can manage all payments" ON public.payments FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for teacher_payouts
CREATE POLICY "Teachers can view their own payouts" ON public.teacher_payouts FOR SELECT USING (auth.uid() = teacher_id);
CREATE POLICY "Admins can manage all payouts" ON public.teacher_payouts FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Create triggers for updated_at
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_homework_updated_at BEFORE UPDATE ON public.homework_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial course catalog
INSERT INTO public.courses (name, description, course_type, format, duration_weeks, sessions_count, price_usd, max_students) VALUES
('1-on-1 Private Lesson', '50-min live lesson with AI co-pilot and homework', 'private_lesson', '1-on-1', NULL, 1, 60.00, 1),
('Group Class (1:6)', '4-week course with 8 sessions of 50 minutes each', 'group_class', 'group', 4, 8, 200.00, 6),
('Monthly Unlimited', 'Unlimited group classes + 4 private lessons per month', 'monthly_unlimited', 'hybrid', 4, NULL, 299.00, NULL),
('TOPIK Prep Bootcamp', '12-week intensive course with group sessions + 6 private lessons', 'bootcamp', 'hybrid', 12, 30, 899.00, 6),
('Free Trial', '30-min 1-on-1 diagnostic session with AI placement', 'free_trial', '1-on-1', NULL, 1, 0.00, 1),
('Korean Starter', 'Beginner group course (1:6 ratio)', 'group_class', 'group', 4, 8, 200.00, 6),
('TOPIK 1-2 Prep', 'Group course + 2 private lessons', 'bootcamp', 'hybrid', 8, 16, 499.00, 6),
('Conversational Korean', 'Per-lesson private conversation practice', 'private_lesson', '1-on-1', NULL, 1, 60.00, 1),
('TOPIK 3-4 Intensive', 'Group course + 4 private lessons', 'bootcamp', 'hybrid', 12, 24, 799.00, 6),
('TOPIK 5-6 Mastery', 'Advanced 1-on-1 only lessons', 'private_lesson', '1-on-1', NULL, 1, 70.00, 1);