-- Create k_dramas table
CREATE TABLE public.k_dramas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  video_url TEXT NOT NULL,
  episode_number INTEGER DEFAULT 1,
  season_number INTEGER DEFAULT 1,
  duration_minutes INTEGER,
  difficulty_level TEXT DEFAULT 'beginner',
  tags TEXT[] DEFAULT '{}',
  is_live BOOLEAN DEFAULT false,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create drama_comments table for comments and live chat
CREATE TABLE public.drama_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  drama_id UUID NOT NULL REFERENCES public.k_dramas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_live_chat BOOLEAN DEFAULT false,
  timestamp_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create drama_reactions table for emoji reactions
CREATE TABLE public.drama_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  drama_id UUID NOT NULL REFERENCES public.k_dramas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(drama_id, user_id, reaction_type)
);

-- Create watch_history table
CREATE TABLE public.watch_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  drama_id UUID NOT NULL REFERENCES public.k_dramas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  progress_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  last_watched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(drama_id, user_id)
);

-- Create vocabulary_notes table for learning from dramas
CREATE TABLE public.vocabulary_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  drama_id UUID NOT NULL REFERENCES public.k_dramas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  word TEXT NOT NULL,
  translation TEXT,
  context TEXT,
  timestamp_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.k_dramas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drama_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drama_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary_notes ENABLE ROW LEVEL SECURITY;

-- K-dramas policies (everyone can view)
CREATE POLICY "Anyone can view k-dramas"
  ON public.k_dramas FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage k-dramas"
  ON public.k_dramas FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Drama comments policies
CREATE POLICY "Anyone can view comments"
  ON public.drama_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON public.drama_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.drama_comments FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all comments"
  ON public.drama_comments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Drama reactions policies
CREATE POLICY "Anyone can view reactions"
  ON public.drama_reactions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage their reactions"
  ON public.drama_reactions FOR ALL
  USING (auth.uid() = user_id);

-- Watch history policies
CREATE POLICY "Users can view their own history"
  ON public.watch_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own history"
  ON public.watch_history FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all history"
  ON public.watch_history FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Vocabulary notes policies
CREATE POLICY "Users can view their own notes"
  ON public.vocabulary_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own notes"
  ON public.vocabulary_notes FOR ALL
  USING (auth.uid() = user_id);

-- Enable realtime for live chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.drama_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.drama_reactions;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_k_dramas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for k_dramas
CREATE TRIGGER update_k_dramas_updated_at
  BEFORE UPDATE ON public.k_dramas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_k_dramas_updated_at();

-- Insert sample k-drama data
INSERT INTO public.k_dramas (title, description, video_url, thumbnail_url, difficulty_level, tags, is_live) VALUES
('Korean Learning Drama - Episode 1', 'A beginner-friendly drama designed for Korean learners with clear pronunciation and everyday vocabulary', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800', 'beginner', ARRAY['learning', 'daily-life', 'beginner-friendly'], true),
('Seoul Stories - Episode 1', 'Follow everyday life in Seoul with intermediate Korean dialogue', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=800', 'intermediate', ARRAY['culture', 'city-life', 'intermediate'], false);