-- Add fields to k_dramas for episode tracking and series grouping
ALTER TABLE public.k_dramas
ADD COLUMN IF NOT EXISTS series_name TEXT,
ADD COLUMN IF NOT EXISTS youtube_id TEXT,
ADD COLUMN IF NOT EXISTS is_ai_discovered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS discovery_date TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_k_dramas_series_name ON public.k_dramas(series_name);
CREATE INDEX IF NOT EXISTS idx_k_dramas_is_ai_discovered ON public.k_dramas(is_ai_discovered);

-- Create table to track shown series to avoid repeats
CREATE TABLE IF NOT EXISTS public.shown_drama_series (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  series_name TEXT NOT NULL UNIQUE,
  first_shown_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  episode_count INTEGER DEFAULT 0
);

ALTER TABLE public.shown_drama_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shown series"
  ON public.shown_drama_series FOR SELECT
  USING (true);

CREATE POLICY "System can manage shown series"
  ON public.shown_drama_series FOR ALL
  USING (true);