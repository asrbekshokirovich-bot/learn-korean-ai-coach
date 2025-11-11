-- Add chat lock status to groups
ALTER TABLE groups ADD COLUMN IF NOT EXISTS chat_locked BOOLEAN DEFAULT false;

-- Create table for lesson chat messages
CREATE TABLE IF NOT EXISTS lesson_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE lesson_chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies for lesson chat messages
CREATE POLICY "Group members can view messages"
  ON lesson_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_enrollments
      WHERE group_enrollments.group_id = lesson_chat_messages.group_id
      AND group_enrollments.student_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = lesson_chat_messages.group_id
      AND groups.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Group members can send messages when unlocked"
  ON lesson_chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      -- Students can send if chat is not locked
      (
        EXISTS (
          SELECT 1 FROM group_enrollments
          WHERE group_enrollments.group_id = lesson_chat_messages.group_id
          AND group_enrollments.student_id = auth.uid()
        )
        AND NOT EXISTS (
          SELECT 1 FROM groups
          WHERE groups.id = lesson_chat_messages.group_id
          AND groups.chat_locked = true
        )
      )
      OR
      -- Teachers can always send
      EXISTS (
        SELECT 1 FROM groups
        WHERE groups.id = lesson_chat_messages.group_id
        AND groups.teacher_id = auth.uid()
      )
    )
  );

-- Enable realtime for lesson chat
ALTER PUBLICATION supabase_realtime ADD TABLE lesson_chat_messages;