import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Lock, Unlock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface LessonChatProps {
  groupId: string;
  userRole: 'student' | 'teacher';
}

export const LessonChat = ({ groupId, userRole }: LessonChatProps) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatLocked, setChatLocked] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInitialData();
    subscribeToMessages();
    subscribeToLockStatus();
  }, [groupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Load group lock status
      const { data: group } = await supabase
        .from("groups")
        .select("chat_locked")
        .eq("id", groupId)
        .single();

      if (group) {
        setChatLocked(group.chat_locked);
      }

      // Load existing messages
      const { data: msgs } = await supabase
        .from("lesson_chat_messages")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });

      if (msgs) {
        setMessages(msgs);
        
        // Load user names
        const userIds = Array.from(new Set(msgs.map(m => m.sender_id)));
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);

        if (profiles) {
          const names = Object.fromEntries(
            profiles.map(p => [p.user_id, p.full_name || 'Unknown'])
          );
          setUserNames(names);
        }
      }
    } catch (error) {
      console.error("Error loading chat data:", error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`lesson_chat_${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lesson_chat_messages',
          filter: `group_id=eq.${groupId}`
        },
        async (payload) => {
          const newMsg = payload.new;
          setMessages(prev => [...prev, newMsg]);

          // Load sender name if not in cache
          if (!userNames[newMsg.sender_id]) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", newMsg.sender_id)
              .single();

            if (profile) {
              setUserNames(prev => ({
                ...prev,
                [newMsg.sender_id]: profile.full_name || 'Unknown'
              }));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToLockStatus = () => {
    const channel = supabase
      .channel(`group_lock_${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'groups',
          filter: `id=eq.${groupId}`
        },
        (payload) => {
          const updated = payload.new as any;
          setChatLocked(updated.chat_locked);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUserId) return;

    if (chatLocked && userRole === 'student') {
      toast.error("Chat is locked by the teacher");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("lesson_chat_messages")
        .insert({
          group_id: groupId,
          sender_id: currentUserId,
          message: newMessage.trim()
        });

      if (error) {
        if (error.message.includes("chat_locked")) {
          toast.error("Chat is locked by the teacher");
        } else {
          throw error;
        }
        return;
      }

      setNewMessage("");
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  const toggleChatLock = async () => {
    if (userRole !== 'teacher') return;

    try {
      const { error } = await supabase
        .from("groups")
        .update({ chat_locked: !chatLocked })
        .eq("id", groupId);

      if (error) throw error;

      toast.success(chatLocked ? "Chat unlocked" : "Chat locked");
    } catch (error) {
      console.error("Error toggling chat lock:", error);
      toast.error("Failed to update chat status");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Lesson Chat</CardTitle>
          <div className="flex items-center gap-2">
            {chatLocked && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Locked
              </Badge>
            )}
            {userRole === 'teacher' && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleChatLock}
              >
                {chatLocked ? (
                  <>
                    <Unlock className="w-4 h-4 mr-1" />
                    Unlock
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-1" />
                    Lock
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-4 pt-0 min-h-0">
        <ScrollArea className="flex-1 pr-4 mb-4">
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg) => {
                const isCurrentUser = msg.sender_id === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        isCurrentUser
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold">
                          {userNames[msg.sender_id] || 'Unknown'}
                        </span>
                        <span className="text-xs opacity-70">
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {msg.message}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {chatLocked && userRole === 'student' && (
          <div className="mb-3 p-2 bg-muted rounded-md flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            <span>Chat is locked by the teacher</span>
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={chatLocked && userRole === 'student' ? "Chat is locked..." : "Type a message..."}
            disabled={loading || (chatLocked && userRole === 'student')}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={loading || !newMessage.trim() || (chatLocked && userRole === 'student')}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};