import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Send, Heart, Smile, ThumbsUp, BookOpen, MessageSquare, Play, Clock, Sparkles, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Drama {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  difficulty_level: string;
  tags: string[];
  is_live: boolean;
  view_count: number;
  created_at: string;
}

interface Comment {
  id: string;
  user_id: string;
  message: string;
  is_live_chat: boolean;
  created_at: string;
  profiles?: { full_name: string };
}

interface Reaction {
  reaction_type: string;
  count: number;
}

const KDrama = () => {
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [selectedDrama, setSelectedDrama] = useState<Drama | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [liveChat, setLiveChat] = useState<Comment[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [message, setMessage] = useState("");
  const [vocabularyNote, setVocabularyNote] = useState({ word: "", translation: "" });
  const [showVocabularyForm, setShowVocabularyForm] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDramas();
  }, []);

  useEffect(() => {
    if (selectedDrama) {
      fetchComments();
      fetchReactions();
      subscribeToRealtime();
    }
  }, [selectedDrama]);

  const fetchDramas = async () => {
    const { data, error } = await supabase
      .from("k_dramas")
      .select("*")
      .order("is_live", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setDramas(data || []);
      if (data && data.length > 0 && !selectedDrama) {
        setSelectedDrama(data[0]);
      }
    }
  };

  const fetchComments = async () => {
    if (!selectedDrama) return;

    const { data, error } = await supabase
      .from("drama_comments")
      .select("*")
      .eq("drama_id", selectedDrama.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching comments:", error);
    } else {
      const allComments = (data || []).map(async (comment) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", comment.user_id)
          .single();
        
        return { ...comment, profiles: profile || { full_name: "Anonymous" } };
      });

      const commentsWithProfiles = await Promise.all(allComments);
      setComments(commentsWithProfiles.filter(c => !c.is_live_chat));
      setLiveChat(commentsWithProfiles.filter(c => c.is_live_chat).reverse());
    }
  };

  const fetchReactions = async () => {
    if (!selectedDrama) return;

    const { data, error } = await supabase
      .from("drama_reactions")
      .select("reaction_type")
      .eq("drama_id", selectedDrama.id);

    if (error) {
      console.error("Error fetching reactions:", error);
    } else {
      const counts = (data || []).reduce((acc, r) => {
        acc[r.reaction_type] = (acc[r.reaction_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      setReactions(
        Object.entries(counts).map(([type, count]) => ({ reaction_type: type, count }))
      );
    }
  };

  const subscribeToRealtime = () => {
    if (!selectedDrama) return;

    const channel = supabase
      .channel(`drama_${selectedDrama.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "drama_comments",
          filter: `drama_id=eq.${selectedDrama.id}`,
        },
        async (payload) => {
          const newComment = payload.new as Comment;
          
          // Fetch user profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", newComment.user_id)
            .single();

          const commentWithProfile = {
            ...newComment,
            profiles: profile,
          };

          if (newComment.is_live_chat) {
            setLiveChat(prev => [...prev, commentWithProfile]);
          } else {
            setComments(prev => [commentWithProfile, ...prev]);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "drama_reactions",
          filter: `drama_id=eq.${selectedDrama.id}`,
        },
        () => {
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (isLiveChat: boolean) => {
    if (!message.trim() || !selectedDrama) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("drama_comments").insert({
      drama_id: selectedDrama.id,
      user_id: user.id,
      message: message.trim(),
      is_live_chat: isLiveChat,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setMessage("");
    }
  };

  const addReaction = async (reactionType: string) => {
    if (!selectedDrama) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("drama_reactions").insert({
      drama_id: selectedDrama.id,
      user_id: user.id,
      reaction_type: reactionType,
    });

    if (error && error.code !== '23505') { // Ignore unique constraint errors
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const saveVocabularyNote = async () => {
    if (!vocabularyNote.word.trim() || !selectedDrama) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("vocabulary_notes").insert({
      drama_id: selectedDrama.id,
      user_id: user.id,
      word: vocabularyNote.word,
      translation: vocabularyNote.translation,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Vocabulary note saved!" });
      setVocabularyNote({ word: "", translation: "" });
      setShowVocabularyForm(false);
    }
  };

  const discoverNewDrama = async () => {
    setIsDiscovering(true);
    try {
      const { data, error } = await supabase.functions.invoke('discover-kdrama');
      
      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: "New K-Drama Discovered!",
          description: `Added ${data.episode_count} episodes of "${data.series_name}"`,
        });
        fetchDramas(); // Refresh the drama list
      } else {
        toast({
          title: "Info",
          description: data?.message || "No new dramas found at this time",
        });
      }
    } catch (error) {
      console.error('Error discovering drama:', error);
      toast({
        title: "Error",
        description: "Failed to discover new K-drama. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  const reactionEmojis = {
    heart: "❤️",
    laugh: "😂",
    wow: "😮",
    thumbsup: "👍",
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">K-Drama Learning Hub</h1>
          <p className="text-muted-foreground mt-2">Watch, learn, and connect with fellow students</p>
        </div>
        <Button 
          onClick={discoverNewDrama} 
          disabled={isDiscovering}
          className="gap-2"
        >
          {isDiscovering ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Discovering...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Discover New Drama
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drama List */}
        <Card className="lg:col-span-1 p-4">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Play className="w-5 h-5" />
            Available Dramas
          </h2>
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {dramas.map((drama) => (
                <Card
                  key={drama.id}
                  className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                    selectedDrama?.id === drama.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedDrama(drama)}
                >
                  {drama.thumbnail_url && (
                    <img
                      src={drama.thumbnail_url}
                      alt={drama.title}
                      className="w-full h-32 object-cover rounded-md mb-2"
                    />
                  )}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm">{drama.title}</h3>
                    {drama.is_live && (
                      <Badge variant="destructive" className="text-xs">LIVE</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">{drama.difficulty_level}</Badge>
                    {drama.tags.slice(0, 2).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{drama.view_count} views</span>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Video Player and Interactions */}
        <Card className="lg:col-span-2 p-6">
          {selectedDrama ? (
            <>
              <div className="aspect-video bg-black rounded-lg mb-4 overflow-hidden">
                <iframe
                  src={selectedDrama.video_url}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold">{selectedDrama.title}</h2>
                  <p className="text-muted-foreground mt-1">{selectedDrama.description}</p>
                </div>

                {/* Reactions */}
                <div className="flex items-center gap-3">
                  {Object.entries(reactionEmojis).map(([type, emoji]) => {
                    const count = reactions.find(r => r.reaction_type === type)?.count || 0;
                    return (
                      <Button
                        key={type}
                        variant="outline"
                        size="sm"
                        onClick={() => addReaction(type)}
                        className="gap-2"
                      >
                        <span className="text-lg">{emoji}</span>
                        {count > 0 && <span>{count}</span>}
                      </Button>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowVocabularyForm(!showVocabularyForm)}
                    className="gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    Save Word
                  </Button>
                </div>

                {/* Vocabulary Form */}
                {showVocabularyForm && (
                  <Card className="p-4 bg-muted">
                    <h3 className="font-semibold mb-3">Save New Vocabulary</h3>
                    <div className="space-y-3">
                      <Input
                        placeholder="Korean word (e.g., 안녕하세요)"
                        value={vocabularyNote.word}
                        onChange={(e) => setVocabularyNote({ ...vocabularyNote, word: e.target.value })}
                      />
                      <Input
                        placeholder="Translation (e.g., Hello)"
                        value={vocabularyNote.translation}
                        onChange={(e) => setVocabularyNote({ ...vocabularyNote, translation: e.target.value })}
                      />
                      <Button onClick={saveVocabularyNote} className="w-full">
                        Save to My Vocabulary
                      </Button>
                    </div>
                  </Card>
                )}

                {/* Tabs for Live Chat and Comments */}
                <Tabs defaultValue="live" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="live">
                      Live Chat {selectedDrama.is_live && <span className="ml-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                    </TabsTrigger>
                    <TabsTrigger value="comments">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Comments ({comments.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="live" className="space-y-4">
                    <Card className="p-4">
                      <ScrollArea className="h-[300px] mb-4">
                        <div className="space-y-3">
                          {liveChat.map((msg) => (
                            <div key={msg.id} className="flex gap-2">
                              <div className="flex-1">
                                <span className="font-semibold text-sm">
                                  {msg.profiles?.full_name || "Anonymous"}:
                                </span>
                                <span className="ml-2 text-sm">{msg.message}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type a message..."
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && sendMessage(true)}
                        />
                        <Button onClick={() => sendMessage(true)} size="icon">
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  </TabsContent>

                  <TabsContent value="comments" className="space-y-4">
                    <Card className="p-4">
                      <div className="flex gap-2 mb-4">
                        <Input
                          placeholder="Add a comment..."
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && sendMessage(false)}
                        />
                        <Button onClick={() => sendMessage(false)} size="icon">
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-4">
                          {comments.map((comment) => (
                            <div key={comment.id} className="border-b pb-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-sm">
                                  {comment.profiles?.full_name || "Anonymous"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                </span>
                              </div>
                              <p className="text-sm">{comment.message}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[600px] text-muted-foreground">
              Select a drama to start watching
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default KDrama;
