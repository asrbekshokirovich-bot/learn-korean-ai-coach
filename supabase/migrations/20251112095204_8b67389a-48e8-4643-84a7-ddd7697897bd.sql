-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true);

-- Create storage bucket for student stories
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-stories', 'student-stories', true);

-- Add profile_picture_url to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_picture_url text;

-- Create student_stories table
CREATE TABLE IF NOT EXISTS public.student_stories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_type text NOT NULL, -- 'image' or 'video'
  caption text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours'),
  view_count integer NOT NULL DEFAULT 0
);

-- Create story_views table to track who viewed each story
CREATE TABLE IF NOT EXISTS public.story_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id uuid NOT NULL REFERENCES public.student_stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

-- Enable RLS on student_stories
ALTER TABLE public.student_stories ENABLE ROW LEVEL SECURITY;

-- Enable RLS on story_views
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_stories
CREATE POLICY "Users can create their own stories"
  ON public.student_stories
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Users can view all active stories"
  ON public.student_stories
  FOR SELECT
  USING (expires_at > now());

CREATE POLICY "Users can delete their own stories"
  ON public.student_stories
  FOR DELETE
  USING (auth.uid() = student_id);

CREATE POLICY "Admins can manage all stories"
  ON public.student_stories
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for story_views
CREATE POLICY "Users can insert their own story views"
  ON public.story_views
  FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Story owners can view who viewed their stories"
  ON public.story_views
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.student_stories
      WHERE student_stories.id = story_views.story_id
      AND student_stories.student_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all story views"
  ON public.story_views
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Storage policies for profile-pictures bucket
CREATE POLICY "Users can upload their own profile picture"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-pictures' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own profile picture"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'profile-pictures' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own profile picture"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'profile-pictures' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view profile pictures"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'profile-pictures');

-- Storage policies for student-stories bucket
CREATE POLICY "Users can upload their own stories"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'student-stories' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own stories"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'student-stories' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view stories"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'student-stories');

-- Create index for faster story queries
CREATE INDEX IF NOT EXISTS idx_student_stories_expires_at ON public.student_stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_student_stories_student_id ON public.student_stories(student_id);
CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON public.story_views(story_id);