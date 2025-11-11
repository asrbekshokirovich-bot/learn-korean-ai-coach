-- Create group_messages table for common group chat
CREATE TABLE public.group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group_direct_messages table for private messages between student and teacher
CREATE TABLE public.group_direct_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_direct_messages ENABLE ROW LEVEL SECURITY;

-- Policies for group_messages
CREATE POLICY "Group members can view group messages"
ON public.group_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_enrollments
    WHERE group_enrollments.group_id = group_messages.group_id
    AND group_enrollments.student_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.groups
    WHERE groups.id = group_messages.group_id
    AND groups.teacher_id = auth.uid()
  )
);

CREATE POLICY "Group members can send messages"
ON public.group_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND (
    EXISTS (
      SELECT 1 FROM public.group_enrollments
      WHERE group_enrollments.group_id = group_messages.group_id
      AND group_enrollments.student_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.groups
      WHERE groups.id = group_messages.group_id
      AND groups.teacher_id = auth.uid()
    )
  )
);

CREATE POLICY "Admins can manage all group messages"
ON public.group_messages
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies for group_direct_messages
CREATE POLICY "Users can view their direct messages"
ON public.group_direct_messages
FOR SELECT
USING (
  auth.uid() = sender_id 
  OR auth.uid() = recipient_id
);

CREATE POLICY "Students can send messages to their group teacher"
ON public.group_direct_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.groups
    WHERE groups.id = group_direct_messages.group_id
    AND (
      (groups.teacher_id = recipient_id AND EXISTS (
        SELECT 1 FROM public.group_enrollments
        WHERE group_enrollments.group_id = groups.id
        AND group_enrollments.student_id = sender_id
      ))
      OR (groups.teacher_id = sender_id AND EXISTS (
        SELECT 1 FROM public.group_enrollments
        WHERE group_enrollments.group_id = groups.id
        AND group_enrollments.student_id = recipient_id
      ))
    )
  )
);

CREATE POLICY "Admins can manage all direct messages"
ON public.group_direct_messages
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for both tables
ALTER TABLE public.group_messages REPLICA IDENTITY FULL;
ALTER TABLE public.group_direct_messages REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_direct_messages;