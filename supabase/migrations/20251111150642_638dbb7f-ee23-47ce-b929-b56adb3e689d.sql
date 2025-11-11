-- Grant teachers access to K-Drama tables
CREATE POLICY "Teachers can view k-dramas"
  ON public.k_dramas FOR SELECT
  USING (has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Teachers can view drama comments"
  ON public.drama_comments FOR SELECT
  USING (has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Teachers can view drama reactions"
  ON public.drama_reactions FOR SELECT
  USING (has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Teachers can view vocabulary notes"
  ON public.vocabulary_notes FOR SELECT
  USING (has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Teachers can view watch history"
  ON public.watch_history FOR SELECT
  USING (has_role(auth.uid(), 'teacher'::app_role));