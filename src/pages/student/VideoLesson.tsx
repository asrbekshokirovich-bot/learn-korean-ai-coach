import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardRoute from "@/components/DashboardRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, ArrowLeft, ExternalLink, AlertCircle, Clock, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

const VideoLesson = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const lessonId = searchParams.get("lessonId");
  const groupId = searchParams.get("groupId");
  
  const [lesson, setLesson] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [meetingLink, setMeetingLink] = useState<string | null>(null);

  useEffect(() => {
    loadLessonData();
  }, [lessonId, groupId]);

  const loadLessonData = async () => {
    try {
      if (groupId) {
        // Load group lesson
        const { data: groupData, error: groupError } = await supabase
          .from("groups")
          .select("*, profiles!groups_teacher_id_fkey(full_name)")
          .eq("id", groupId)
          .single();

        if (groupError) throw groupError;

        setGroup(groupData);
        setMeetingLink(groupData.meeting_link);
      } else if (lessonId) {
        // Load 1:1 lesson
        const { data: lessonData, error: lessonError } = await supabase
          .from("lessons")
          .select(`
            *,
            video_lessons(*),
            profiles!lessons_teacher_id_fkey(full_name)
          `)
          .eq("id", lessonId)
          .single();

        if (lessonError) throw lessonError;

        setLesson(lessonData);
        setMeetingLink(lessonData.video_lessons?.[0]?.meeting_link);
      }
    } catch (error: any) {
      toast.error("Failed to load lesson: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMeeting = () => {
    if (meetingLink) {
      window.open(meetingLink, "_blank");
    }
  };

  if (loading) {
    return (
      <DashboardRoute>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </DashboardRoute>
    );
  }

  const lessonInfo = group || lesson;
  const teacherName = lessonInfo?.profiles?.full_name || "Your Teacher";
  const lessonTitle = group ? group.name : "1:1 Lesson";
  const lessonTime = lesson ? format(new Date(lesson.scheduled_at), "MMM d, yyyy 'at' h:mm a") : 
                     group ? `${group.scheduled_days?.join(", ")} at ${group.start_time}` : "";

  return (
    <DashboardRoute>
      <div className="container mx-auto p-6 max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Schedule
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-6 h-6" />
              {lessonTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                <span>Teacher: {teacherName}</span>
              </div>
              {lessonTime && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{lessonTime}</span>
                </div>
              )}
            </div>

            {!meetingLink ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  The teacher hasn't added a Google Meet link yet. Please check back later or contact your teacher.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">Google Meet Link</p>
                  <p className="text-xs text-muted-foreground break-all">{meetingLink}</p>
                </div>

                <Button 
                  size="lg" 
                  className="w-full"
                  onClick={handleJoinMeeting}
                >
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Join Google Meet
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Clicking the button will open Google Meet in a new tab
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardRoute>
  );
};

export default VideoLesson;