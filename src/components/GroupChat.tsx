import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, Users, UserCircle, Paperclip, Download, FileText, Image as ImageIcon, User } from "lucide-react";
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        sender:profiles!group_messages_sender_id_fkey(full_name, email, profile_picture_url)
      `)
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });

    setGroupMessages(groupMsgs || []);

    // Load direct messages
    const { data: directMsgs } = await supabase
      .from("group_direct_messages")
      .select(`
        *,
        sender:profiles!group_direct_messages_sender_id_fkey(full_name, email, profile_picture_url),
        recipient:profiles!group_direct_messages_recipient_id_fkey(full_name, email, profile_picture_url)
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
            .select("full_name, email, profile_picture_url")
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
            .select("full_name, email, profile_picture_url")
            .eq("user_id", payload.new.sender_id)
            .single();

          const { data: recipientProfile } = await supabase
            .from("profiles")
            .select("full_name, email, profile_picture_url")
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

  const uploadFile = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${groupId}/${currentUserId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError, data } = await supabase.storage
      .from('chat-files')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    return {
      file_url: fileName,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
    };
  };

  const sendGroupMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !currentUserId) return;

    try {
      setUploading(true);
      let fileData = null;

      if (selectedFile) {
        fileData = await uploadFile(selectedFile);
      }

      const { error } = await supabase.from("group_messages").insert({
        group_id: groupId,
        sender_id: currentUserId,
        message: newMessage.trim() || (selectedFile ? `Sent a file: ${selectedFile.name}` : ''),
        ...fileData,
      });

      if (error) throw error;

      setNewMessage("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: any) {
      toast.error("Failed to send message");
    } finally {
      setUploading(false);
    }
  };

  const sendDirectMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !currentUserId || !teacherId) return;

    try {
      setUploading(true);
      let fileData = null;

      if (selectedFile) {
        fileData = await uploadFile(selectedFile);
      }

      const { error } = await supabase.from("group_direct_messages").insert({
        group_id: groupId,
        sender_id: currentUserId,
        recipient_id: teacherId,
        message: newMessage.trim() || (selectedFile ? `Sent a file: ${selectedFile.name}` : ''),
        ...fileData,
      });

      if (error) throw error;

      setNewMessage("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: any) {
      toast.error("Failed to send message");
    } finally {
      setUploading(false);
    }
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File size must be less than 20MB");
      return;
    }

    setSelectedFile(file);
  };

  const downloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('chat-files')
        .download(fileUrl);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error("Failed to download file");
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const isImageFile = (fileType: string) => fileType?.startsWith('image/');

  const renderMessage = (msg: any, isGroupMessage: boolean) => {
    const isOwnMessage = msg.sender_id === currentUserId;
    
    return (
      <div
        key={msg.id}
        className={`flex gap-3 mb-4 ${isOwnMessage ? "flex-row-reverse" : ""}`}
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={msg.sender?.profile_picture_url} />
          <AvatarFallback>
            <User className="w-5 h-5" />
          </AvatarFallback>
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
            
            {msg.file_url && (
              <div className="mt-2 pt-2 border-t border-current/20">
                {isImageFile(msg.file_type) ? (
                  <div className="space-y-2">
                    <img
                      src={`${supabase.storage.from('chat-files').getPublicUrl(msg.file_url).data.publicUrl}`}
                      alt={msg.file_name}
                      className="max-w-full rounded cursor-pointer"
                      onClick={() => window.open(supabase.storage.from('chat-files').getPublicUrl(msg.file_url).data.publicUrl, '_blank')}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadFile(msg.file_url, msg.file_name)}
                      className="w-full"
                    >
                      <Download className="w-3 h-3 mr-2" />
                      Download {msg.file_name}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadFile(msg.file_url, msg.file_name)}
                    className="w-full"
                  >
                    {getFileIcon(msg.file_type)}
                    <span className="ml-2 truncate">{msg.file_name}</span>
                    <Download className="w-3 h-3 ml-2" />
                  </Button>
                )}
                <p className="text-xs opacity-70 mt-1">
                  {(msg.file_size / 1024).toFixed(1)} KB
                </p>
              </div>
            )}
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

      <div className="p-4 border-t space-y-2">
        {selectedFile && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded">
            {getFileIcon(selectedFile.type)}
            <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
            <span className="text-xs text-muted-foreground">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              ×
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
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
            disabled={uploading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={(!newMessage.trim() && !selectedFile) || uploading}
          >
            {uploading ? "..." : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </Card>
  );
};
