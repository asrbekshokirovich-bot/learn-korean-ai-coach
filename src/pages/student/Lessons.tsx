import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Video, MessageSquare, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import LinkConversationDialog from "@/components/LinkConversationDialog";
import { useLanguage } from "@/contexts/LanguageContext";

const Lessons = () => {
  const { t } = useLanguage();
  const [upcomingLessons, setUpcomingLessons] = useState<any[]>([]);
  const [completedLessons, setCompletedLessons] = useState<any[]>([]);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadLessons();
  }, []);

  const loadLessons = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Upcoming lessons
    const { data: upcoming } = await supabase
      .from("lessons")
      .select(`
        *,
        profiles!lessons_teacher_id_fkey (full_name),
        lesson_conversations (
          conversation_analysis (
            id,
            analysis_date,
            confidence_score
          )
        )
      `)
      .eq("student_id", user.id)
      .eq("status", "scheduled")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true });

    setUpcomingLessons(upcoming || []);

    // Completed lessons
    const { data: completed } = await supabase
      .from("lessons")
      .select(`
        *,
        profiles!lessons_teacher_id_fkey (full_name),
        lesson_conversations (
          conversation_analysis (
            id,
            analysis_date,
            confidence_score
          )
        )
      `)
      .eq("student_id", user.id)
      .eq("status", "completed")
      .order("scheduled_at", { ascending: false })
      .limit(10);

    setCompletedLessons(completed || []);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">My Lessons</h2>
        <p className="text-muted-foreground">Manage your upcoming and past lessons</p>
      </div>

      {/* Upcoming Lessons */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Upcoming Lessons</h3>
        {upcomingLessons.length === 0 ? (
          <p className="text-muted-foreground">No upcoming lessons scheduled</p>
        ) : (
          <div className="space-y-4">
            {upcomingLessons.map((lesson) => (
              <div key={lesson.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-lg">{lesson.lesson_type === "individual" ? "1-on-1 Lesson" : "Group Lesson"}</h4>
                    <p className="text-sm text-muted-foreground">
                      Teacher: {lesson.profiles?.full_name || "TBA"}
                    </p>
                  </div>
                  <Badge>{lesson.lesson_type}</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(lesson.scheduled_at), "PPP")}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {format(new Date(lesson.scheduled_at), "p")} ({lesson.duration_minutes} min)
                  </div>
                </div>

                {lesson.lesson_conversations && lesson.lesson_conversations.length > 0 && (
                  <div className="mb-3 p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4" />
                      <p className="text-sm font-medium">
                        {lesson.lesson_conversations.length} Linked Conversation(s)
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {lesson.lesson_conversations.map((lc: any) => (
                        <Badge key={lc.conversation_analysis.id} variant="outline">
                          {format(new Date(lc.conversation_analysis.analysis_date), "MMM dd")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {lesson.meeting_link && (
                    <Button size="sm" onClick={() => window.open(lesson.meeting_link, "_blank")}>
                      <Video className="w-4 h-4 mr-2" />
                      Join Lesson
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedLesson(lesson);
                      setLinkDialogOpen(true);
                    }}
                  >
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Link Conversations
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Completed Lessons */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Completed Lessons</h3>
        {completedLessons.length === 0 ? (
          <p className="text-muted-foreground">No completed lessons yet</p>
        ) : (
          <div className="space-y-3">
            {completedLessons.map((lesson) => (
              <div key={lesson.id} className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium">{lesson.lesson_type === "individual" ? "1-on-1 Lesson" : "Group Lesson"}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(lesson.scheduled_at), "PPP")} • {lesson.profiles?.full_name}
                    </p>
                  </div>
                  <Badge variant="secondary">Completed</Badge>
                </div>
                {lesson.lesson_conversations && lesson.lesson_conversations.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                    <MessageSquare className="w-3 h-3" />
                    <span>{lesson.lesson_conversations.length} linked conversation(s)</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {selectedLesson && (
        <LinkConversationDialog
          open={linkDialogOpen}
          onOpenChange={setLinkDialogOpen}
          lessonId={selectedLesson.id}
          onSuccess={loadLessons}
        />
      )}
    </div>
  );
};

export default Lessons;
