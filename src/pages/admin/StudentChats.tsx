import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const StudentChats = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      loadMessages(selectedStudent.student_id);
      
      // Subscribe to new messages for this student
      const channel = supabase
        .channel(`student_${selectedStudent.student_id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'student_admin_chats',
            filter: `student_id=eq.${selectedStudent.student_id}`,
          },
          (payload) => {
            setMessages(prev => [...prev, payload.new]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedStudent]);

  const loadStudents = async () => {
    // Get all students who have sent messages
    const { data, error } = await supabase
      .from("student_admin_chats")
      .select(`
        student_id,
        profiles!student_admin_chats_student_id_fkey(full_name, email)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load students");
      return;
    }

    // Get unique students
    const uniqueStudents = data?.reduce((acc: any[], curr) => {
      if (!acc.find(s => s.student_id === curr.student_id)) {
        acc.push(curr);
      }
      return acc;
    }, []);

    setStudents(uniqueStudents || []);
  };

  const loadMessages = async (studentId: string) => {
    const { data, error } = await supabase
      .from("student_admin_chats")
      .select("*")
      .eq("student_id", studentId)
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
    const fileName = `admin/${Date.now()}.${fileExt}`;

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
    if (!selectedStudent) return;

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
          student_id: selectedStudent.student_id,
          admin_id: user.id,
          message: newMessage.trim() || (selectedFile ? `Sent a file: ${selectedFile.name}` : ""),
          sender_role: 'admin',
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
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Student Chats</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
        {/* Students List */}
        <Card className="p-4 overflow-y-auto">
          <h2 className="font-semibold mb-4">Students</h2>
          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground">No conversations yet</p>
          ) : (
            <div className="space-y-2">
              {students.map((student) => (
                <Button
                  key={student.student_id}
                  variant={selectedStudent?.student_id === student.student_id ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedStudent(student)}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{student.profiles?.full_name || 'Unknown'}</span>
                    <span className="text-xs opacity-70">{student.profiles?.email}</span>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </Card>

        {/* Chat Area */}
        <Card className="md:col-span-2 flex flex-col">
          {selectedStudent ? (
            <>
              <div className="p-4 border-b">
                <h2 className="text-xl font-bold">{selectedStudent.profiles?.full_name}</h2>
                <p className="text-sm text-muted-foreground">{selectedStudent.profiles?.email}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        msg.sender_role === 'admin'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="text-sm font-medium mb-1">
                        {msg.sender_role === 'admin' ? 'You (Admin)' : 'Student'}
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
                ))}
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
                    id="admin-file-upload"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => document.getElementById('admin-file-upload')?.click()}
                    disabled={loading}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  
                  <Input
                    placeholder="Type your response..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    disabled={loading}
                  />
                  
                  <Button onClick={handleSendMessage} disabled={loading || uploading}>
                    {uploading ? "Uploading..." : <><Send className="h-4 w-4 mr-2" />Send</>}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a student to view conversation
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default StudentChats;
