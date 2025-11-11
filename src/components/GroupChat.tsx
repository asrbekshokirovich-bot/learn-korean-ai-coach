import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, Users, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface GroupChatProps {
  groupId: string;
  teacherId: string | null;
  groupName: string;
}

export const GroupChat = ({ groupId, teacherId, groupName }: GroupChatProps) => {
  const [groupMessages, setGroupMessages] = useState<any[]>([]);
  const [directMessages, setDirectMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState("group");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCurrentUser();
    loadMessages();
    setupRealtimeSubscriptions();
  }, [groupId]);

  useEffect(() => {
    scrollToBottom();
  }, [groupMessages, directMessages, currentTab]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const loadMessages = async () => {
    // Load group messages
    const { data: groupMsgs } = await supabase
      .from("group_messages")
      .select(`
        *,
        sender:profiles!group_messages_sender_id_fkey(full_name, email)
      `)
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });

    setGroupMessages(groupMsgs || []);

    // Load direct messages
    const { data: directMsgs } = await supabase
      .from("group_direct_messages")
      .select(`
        *,
        sender:profiles!group_direct_messages_sender_id_fkey(full_name, email),
        recipient:profiles!group_direct_messages_recipient_id_fkey(full_name, email)
      `)
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });

    setDirectMessages(directMsgs || []);
  };

  const setupRealtimeSubscriptions = () => {
    // Subscribe to group messages
    const groupChannel = supabase
      .channel(`group-messages-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          // Fetch sender profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", payload.new.sender_id)
            .single();

          setGroupMessages((prev) => [...prev, { ...payload.new, sender: profile }]);
        }
      )
      .subscribe();

    // Subscribe to direct messages
    const directChannel = supabase
      .channel(`direct-messages-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_direct_messages",
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          // Fetch sender and recipient profiles
          const { data: senderProfile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", payload.new.sender_id)
            .single();

          const { data: recipientProfile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", payload.new.recipient_id)
            .single();

          setDirectMessages((prev) => [
            ...prev,
            { ...payload.new, sender: senderProfile, recipient: recipientProfile },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(groupChannel);
      supabase.removeChannel(directChannel);
    };
  };

  const sendGroupMessage = async () => {
    if (!newMessage.trim() || !currentUserId) return;

    const { error } = await supabase.from("group_messages").insert({
      group_id: groupId,
      sender_id: currentUserId,
      message: newMessage.trim(),
    });

    if (error) {
      toast.error("Failed to send message");
      return;
    }

    setNewMessage("");
  };

  const sendDirectMessage = async () => {
    if (!newMessage.trim() || !currentUserId || !teacherId) return;

    const { error } = await supabase.from("group_direct_messages").insert({
      group_id: groupId,
      sender_id: currentUserId,
      recipient_id: teacherId,
      message: newMessage.trim(),
    });

    if (error) {
      toast.error("Failed to send message");
      return;
    }

    setNewMessage("");
  };

  const handleSendMessage = () => {
    if (currentTab === "group") {
      sendGroupMessage();
    } else {
      sendDirectMessage();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessage = (msg: any, isGroupMessage: boolean) => {
    const isOwnMessage = msg.sender_id === currentUserId;
    
    return (
      <div
        key={msg.id}
        className={`flex gap-3 mb-4 ${isOwnMessage ? "flex-row-reverse" : ""}`}
      >
        <Avatar className="h-8 w-8">
          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
            <UserCircle className="w-5 h-5" />
          </div>
        </Avatar>
        <div className={`flex flex-col ${isOwnMessage ? "items-end" : ""} max-w-[70%]`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">
              {msg.sender?.full_name || msg.sender?.email || "Unknown"}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(msg.created_at), "HH:mm")}
            </span>
          </div>
          <div
            className={`rounded-lg px-4 py-2 ${
              isOwnMessage
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            }`}
          >
            <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-lg">{groupName}</h3>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-2">
          <TabsTrigger value="group" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Group Chat
          </TabsTrigger>
          <TabsTrigger value="teacher" className="flex items-center gap-2" disabled={!teacherId}>
            <UserCircle className="w-4 h-4" />
            Teacher
            {!teacherId && <Badge variant="secondary" className="ml-2">No teacher</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="group" className="flex-1 flex flex-col mt-0">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {groupMessages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              groupMessages.map((msg) => renderMessage(msg, true))
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="teacher" className="flex-1 flex flex-col mt-0">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {directMessages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No messages yet. Send a private message to your teacher!
              </div>
            ) : (
              directMessages.map((msg) => renderMessage(msg, false))
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              currentTab === "group"
                ? "Type a message to the group..."
                : "Type a message to your teacher..."
            }
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
