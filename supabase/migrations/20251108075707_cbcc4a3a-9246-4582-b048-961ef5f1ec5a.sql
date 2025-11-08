-- Create table to link lessons with conversation analyses
CREATE TABLE public.lesson_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  conversation_analysis_id UUID NOT NULL REFERENCES public.conversation_analysis(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lesson_id, conversation_analysis_id)
);

-- Enable RLS
ALTER TABLE public.lesson_conversations ENABLE ROW LEVEL SECURITY;

-- Students can link their own conversations to their lessons
CREATE POLICY "Students can manage their lesson conversations"
ON public.lesson_conversations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.lessons
    WHERE lessons.id = lesson_conversations.lesson_id
    AND lessons.student_id = auth.uid()
  )
);

-- Teachers can view lesson conversations for their lessons
CREATE POLICY "Teachers can view lesson conversations"
ON public.lesson_conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lessons
    WHERE lessons.id = lesson_conversations.lesson_id
    AND lessons.teacher_id = auth.uid()
  )
);

-- Admins can manage all
CREATE POLICY "Admins can manage all lesson conversations"
ON public.lesson_conversations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));