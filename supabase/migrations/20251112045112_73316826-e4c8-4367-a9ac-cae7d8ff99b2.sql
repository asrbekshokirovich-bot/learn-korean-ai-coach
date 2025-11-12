-- Enable realtime for support_requests table
ALTER TABLE public.support_requests REPLICA IDENTITY FULL;

-- Add support_requests to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_requests;