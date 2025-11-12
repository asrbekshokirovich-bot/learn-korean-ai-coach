import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";

interface Story {
  id: string;
  student_id: string;
  file_url: string;
  file_type: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
  view_count: number;
  profiles: {
    full_name: string | null;
    profile_picture_url: string | null;
  };
}

export const StoryViewer = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStories();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('stories-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'student_stories'
      }, () => {
        loadStories();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadStories = async () => {
    try {
      const { data, error } = await supabase
        .from('student_stories')
        .select(`
          *,
          profiles!student_stories_student_id_fkey (
            full_name,
            profile_picture_url
          )
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStories((data as any) || []);
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsViewed = async (storyId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Insert view record
      await supabase
        .from('story_views')
        .insert({
          story_id: storyId,
          viewer_id: user.id
        });

      // Update view count
      const { data: story } = await supabase
        .from('student_stories')
        .select('view_count')
        .eq('id', storyId)
        .single();

      if (story) {
        await supabase
          .from('student_stories')
          .update({ view_count: story.view_count + 1 })
          .eq('id', storyId);
      }
    } catch (error) {
      // Ignore duplicate view errors
      console.log('View already recorded or error:', error);
    }
  };

  useEffect(() => {
    if (selectedStoryIndex === null) return;

    const story = stories[selectedStoryIndex];
    if (!story) return;

    markAsViewed(story.id);

    // Auto-progress story
    const duration = 5000; // 5 seconds per story
    const interval = 50;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += interval;
      const newProgress = (elapsed / duration) * 100;
      
      if (newProgress >= 100) {
        handleNext();
      } else {
        setProgress(newProgress);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [selectedStoryIndex]);

  const handleNext = () => {
    if (selectedStoryIndex === null) return;
    
    if (selectedStoryIndex < stories.length - 1) {
      setSelectedStoryIndex(selectedStoryIndex + 1);
      setProgress(0);
    } else {
      setSelectedStoryIndex(null);
      setProgress(0);
    }
  };

  const handlePrevious = () => {
    if (selectedStoryIndex === null) return;
    
    if (selectedStoryIndex > 0) {
      setSelectedStoryIndex(selectedStoryIndex - 1);
      setProgress(0);
    }
  };

  // Group stories by user
  const groupedStories = stories.reduce((acc, story) => {
    if (!acc[story.student_id]) {
      acc[story.student_id] = [];
    }
    acc[story.student_id].push(story);
    return acc;
  }, {} as Record<string, Story[]>);

  if (loading) return <div className="text-sm text-muted-foreground">Loading stories...</div>;
  if (stories.length === 0) return null;

  const selectedStory = selectedStoryIndex !== null ? stories[selectedStoryIndex] : null;

  return (
    <>
      {/* Stories Preview Bar */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {Object.entries(groupedStories).map(([studentId, userStories]) => {
          const firstStory = userStories[0];
          return (
            <button
              key={studentId}
              onClick={() => {
                const index = stories.findIndex(s => s.id === firstStory.id);
                setSelectedStoryIndex(index);
              }}
              className="flex flex-col items-center gap-2 min-w-[80px] group"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary via-accent to-secondary rounded-full p-0.5 animate-pulse">
                  <div className="bg-background rounded-full p-0.5">
                    <Avatar className="h-16 w-16 border-2 border-background">
                      <AvatarImage src={firstStory.profiles.profile_picture_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                        {firstStory.profiles.full_name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </div>
              <span className="text-xs text-center truncate w-full group-hover:text-primary transition-colors">
                {firstStory.profiles.full_name || "Student"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Story Viewer Dialog */}
      <Dialog open={selectedStory !== null} onOpenChange={() => setSelectedStoryIndex(null)}>
        <DialogContent className="max-w-md p-0 bg-black border-none">
          {selectedStory && (
            <div className="relative h-[600px] flex flex-col">
              {/* Progress Bar */}
              <div className="absolute top-0 left-0 right-0 z-20 p-2 flex gap-1">
                {stories.map((_, idx) => (
                  <Progress
                    key={idx}
                    value={idx === selectedStoryIndex ? progress : idx < selectedStoryIndex ? 100 : 0}
                    className="h-1 flex-1"
                  />
                ))}
              </div>

              {/* Header */}
              <div className="absolute top-4 left-0 right-0 z-20 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-white">
                    <AvatarImage src={selectedStory.profiles.profile_picture_url || undefined} />
                    <AvatarFallback>{selectedStory.profiles.full_name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-white font-semibold text-sm">
                      {selectedStory.profiles.full_name || "Student"}
                    </p>
                    <p className="text-white/70 text-xs">
                      {formatDistanceToNow(new Date(selectedStory.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-white text-sm">
                    <Eye className="w-4 h-4" />
                    <span>{selectedStory.view_count}</span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setSelectedStoryIndex(null)}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Story Content */}
              <div className="flex-1 flex items-center justify-center bg-black">
                {selectedStory.file_type === 'image' ? (
                  <img
                    src={selectedStory.file_url}
                    alt="Story"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <video
                    src={selectedStory.file_url}
                    className="max-w-full max-h-full object-contain"
                    autoPlay
                    loop
                    muted
                  />
                )}
              </div>

              {/* Caption */}
              {selectedStory.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white text-center">{selectedStory.caption}</p>
                </div>
              )}

              {/* Navigation */}
              <button
                onClick={handlePrevious}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                disabled={selectedStoryIndex === 0}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};