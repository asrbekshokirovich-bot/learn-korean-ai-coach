-- Add demo_teacher role to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'demo_teacher';

-- Create student_admin_chats table for direct messaging
CREATE TABLE IF NOT EXISTS public.student_admin_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  sender_role app_role NOT NULL,
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.student_admin_chats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_admin_chats
CREATE POLICY "Students can view their own chat messages"
ON public.student_admin_chats
FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Students can send messages"
ON public.student_admin_chats
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = student_id 
  AND has_role(auth.uid(), 'student'::app_role)
  AND sender_role = 'student'::app_role
);

CREATE POLICY "Admins can view all chat messages"
ON public.student_admin_chats
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can send messages"
ON public.student_admin_chats
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND sender_role = 'admin'::app_role
);

-- Create monthly_subscriptions table
CREATE TABLE IF NOT EXISTS public.monthly_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_period DATE NOT NULL,
  amount_uzs NUMERIC NOT NULL DEFAULT 500000,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue')),
  payment_date TIMESTAMP WITH TIME ZONE,
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(student_id, month_period)
);

-- Enable RLS
ALTER TABLE public.monthly_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for monthly_subscriptions
CREATE POLICY "Students can view their own subscriptions"
ON public.monthly_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Admins can manage all subscriptions"
ON public.monthly_subscriptions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_admin_chats;

-- Trigger for updated_at
CREATE TRIGGER update_monthly_subscriptions_updated_at
BEFORE UPDATE ON public.monthly_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();