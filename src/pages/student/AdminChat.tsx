import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

const AdminChat = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    loadMessages();
    
    // Subscribe to new messages
    const channel = supabase
      .channel('student_admin_chats')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'student_admin_chats',
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("student_admin_chats")
      .select("*")
      .eq("student_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Failed to load messages");
      return;
    }

    setMessages(data || []);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('chat-files')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('chat-files')
      .getPublicUrl(fileName);

    return {
      url: data.publicUrl,
      name: file.name,
      size: file.size,
      type: file.type,
    };
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;

    setLoading(true);
    setUploading(!!selectedFile);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      let fileData = null;
      if (selectedFile) {
        fileData = await uploadFile(selectedFile);
      }

      const { error } = await supabase
        .from("student_admin_chats")
        .insert({
          student_id: user.id,
          message: newMessage.trim() || (selectedFile ? `Sent a file: ${selectedFile.name}` : ""),
          sender_role: 'student',
          file_url: fileData?.url,
          file_name: fileData?.name,
          file_size: fileData?.size,
          file_type: fileData?.type,
        });

      if (error) throw error;

      setNewMessage("");
      setSelectedFile(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl h-[calc(100vh-8rem)]">
      <Card className="flex flex-col h-full">
        <div className="p-4 border-b">
          <h2 className="text-2xl font-bold">Chat with Admins</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Request demo lessons, ask questions, or inquire about joining groups
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>No messages yet. Start a conversation with admins!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_role === 'student' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.sender_role === 'student'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="text-sm font-medium mb-1">
                    {msg.sender_role === 'student' ? 'You' : 'Admin'}
                  </div>
                  <p className="text-sm">{msg.message}</p>
                  {msg.file_url && (
                    <a
                      href={msg.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs underline block mt-2"
                    >
                      📎 {msg.file_name}
                    </a>
                  )}
                  <div className="text-xs opacity-70 mt-1">
                    {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t">
          {selectedFile && (
            <div className="mb-2 flex items-center gap-2 p-2 bg-muted rounded">
              <Paperclip className="h-4 w-4" />
              <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <div className="flex gap-2">
            <Input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={loading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              disabled={loading}
            />
            
            <Button onClick={handleSendMessage} disabled={loading || uploading}>
              {uploading ? (
                "Uploading..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminChat;
