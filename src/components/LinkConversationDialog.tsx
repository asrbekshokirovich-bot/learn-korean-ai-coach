import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";

interface LinkConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationAnalysisId?: string;
  conversationDate?: string;
  lessonId?: string;
  onSuccess?: () => void;
}

const LinkConversationDialog = ({
  open,
  onOpenChange,
  conversationAnalysisId,
  conversationDate,
  lessonId,
  onSuccess,
}: LinkConversationDialogProps) => {
  const [items, setItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const mode = lessonId ? "conversations" : "lessons";

  useEffect(() => {
    if (open) {
      loadItems();
    }
  }, [open]);

  const loadItems = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (mode === "lessons") {
      // Loading lessons for a conversation
      const { data: lessonsData } = await supabase
        .from("lessons")
        .select(`
          *,
          profiles!lessons_teacher_id_fkey (full_name)
        `)
        .eq("student_id", user.id)
        .in("status", ["scheduled", "completed"])
        .order("scheduled_at", { ascending: false });

      const lessonIds = lessonsData?.map(l => l.id) || [];
      const { data: linkedData } = await supabase
        .from("lesson_conversations")
        .select("lesson_id")
        .eq("conversation_analysis_id", conversationAnalysisId)
        .in("lesson_id", lessonIds);

      const alreadyLinked = linkedData?.map(l => l.lesson_id) || [];
      setSelectedItems(alreadyLinked);
      setItems(lessonsData || []);
    } else {
      // Loading conversations for a lesson
      const { data: conversationsData } = await supabase
        .from("conversation_analysis")
        .select(`
          *,
          conversation_recordings!inner (
            recording_date,
            student_id
          )
        `)
        .eq("conversation_recordings.student_id", user.id)
        .order("analysis_date", { ascending: false });

      const conversationIds = conversationsData?.map(c => c.id) || [];
      const { data: linkedData } = await supabase
        .from("lesson_conversations")
        .select("conversation_analysis_id")
        .eq("lesson_id", lessonId)
        .in("conversation_analysis_id", conversationIds);

      const alreadyLinked = linkedData?.map(l => l.conversation_analysis_id) || [];
      setSelectedItems(alreadyLinked);
      setItems(conversationsData || []);
    }
  };

  const handleLink = async () => {
    setIsLoading(true);
    try {
      if (mode === "lessons") {
        // Get currently linked lessons
        const { data: currentLinks } = await supabase
          .from("lesson_conversations")
          .select("lesson_id")
          .eq("conversation_analysis_id", conversationAnalysisId);

        const currentlyLinked = currentLinks?.map(l => l.lesson_id) || [];
        
        const toAdd = selectedItems.filter(id => !currentlyLinked.includes(id));
        const toRemove = currentlyLinked.filter(id => !selectedItems.includes(id));

        if (toRemove.length > 0) {
          await supabase
            .from("lesson_conversations")
            .delete()
            .eq("conversation_analysis_id", conversationAnalysisId)
            .in("lesson_id", toRemove);
        }

        if (toAdd.length > 0) {
          await supabase
            .from("lesson_conversations")
            .insert(
              toAdd.map(lessonId => ({
                lesson_id: lessonId,
                conversation_analysis_id: conversationAnalysisId!,
              }))
            );
        }
      } else {
        // Get currently linked conversations
        const { data: currentLinks } = await supabase
          .from("lesson_conversations")
          .select("conversation_analysis_id")
          .eq("lesson_id", lessonId);

        const currentlyLinked = currentLinks?.map(l => l.conversation_analysis_id) || [];
        
        const toAdd = selectedItems.filter(id => !currentlyLinked.includes(id));
        const toRemove = currentlyLinked.filter(id => !selectedItems.includes(id));

        if (toRemove.length > 0) {
          await supabase
            .from("lesson_conversations")
            .delete()
            .eq("lesson_id", lessonId)
            .in("conversation_analysis_id", toRemove);
        }

        if (toAdd.length > 0) {
          await supabase
            .from("lesson_conversations")
            .insert(
              toAdd.map(conversationId => ({
                lesson_id: lessonId!,
                conversation_analysis_id: conversationId,
              }))
            );
        }
      }

      toast({
        title: "Successfully linked!",
        description: `Linked ${selectedItems.length} ${mode === "lessons" ? "lesson(s)" : "conversation(s)"}`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error linking:", error);
      toast({
        title: "Error",
        description: "Failed to link items",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItem = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "lessons" ? "Link Conversation to Lessons" : "Link Conversations to Lesson"}
          </DialogTitle>
          <DialogDescription>
            {mode === "lessons" 
              ? `Select lessons to link this conversation from ${conversationDate ? format(new Date(conversationDate), "PPP") : ""}`
              : "Select conversations to link to this lesson"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {mode === "lessons" 
                ? "No lessons found. Book a lesson first to link conversations." 
                : "No conversations found. Record some conversations first."
              }
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                onClick={() => toggleItem(item.id)}
              >
                <Checkbox
                  checked={selectedItems.includes(item.id)}
                  onCheckedChange={() => toggleItem(item.id)}
                />
                <div className="flex-1">
                  {mode === "lessons" ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{item.lesson_type === "individual" ? "1-on-1 Lesson" : "Group Lesson"}</p>
                        <Badge variant={item.status === "completed" ? "secondary" : "default"}>
                          {item.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(item.scheduled_at), "PPP")}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(item.scheduled_at), "p")}
                        </div>
                      </div>
                      {item.profiles?.full_name && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Teacher: {item.profiles.full_name}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          <p className="font-medium">Conversation</p>
                        </div>
                        {item.confidence_score && (
                          <Badge variant="outline">{item.confidence_score}% confidence</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(item.analysis_date), "PPP")}
                      </div>
                      {item.struggle_areas && item.struggle_areas.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground">Focus areas:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.struggle_areas.slice(0, 3).map((area: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleLink} disabled={isLoading || selectedItems.length === 0}>
            {isLoading ? "Linking..." : `Link ${selectedItems.length} ${mode === "lessons" ? "Lesson(s)" : "Conversation(s)"}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LinkConversationDialog;
