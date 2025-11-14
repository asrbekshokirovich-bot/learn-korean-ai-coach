import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardRoute from "@/components/DashboardRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, ArrowLeft, ExternalLink, Save } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const VideoLesson = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const lessonId = searchParams.get("lessonId");
  const groupId = searchParams.get("groupId");
  
  const [lesson, setLesson] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [meetingLink, setMeetingLink] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLessonData();
  }, [lessonId, groupId]);

  const loadLessonData = async () => {
    try {
      if (groupId) {
        const { data: groupData, error: groupError } = await supabase
          .from("groups")
          .select("*")
          .eq("id", groupId)
          .single();

        if (groupError) throw groupError;

        setGroup(groupData);
        setMeetingLink(groupData.meeting_link || "");
      } else if (lessonId) {
        const { data: lessonData, error: lessonError } = await supabase
          .from("lessons")
          .select(`
            *,
            video_lessons(*),
            profiles!lessons_student_id_fkey(full_name)
          `)
          .eq("id", lessonId)
          .single();

        if (lessonError) throw lessonError;

        setLesson(lessonData);
        setMeetingLink(lessonData.video_lessons?.[0]?.meeting_link || "");
      }
    } catch (error: any) {
      toast.error("Failed to load lesson: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLink = async () => {
    if (!meetingLink.trim()) {
      toast.error("Please enter a valid Google Meet link");
      return;
    }

    setSaving(true);
    try {
      if (groupId) {
        const { error } = await supabase
          .from("groups")
          .update({ meeting_link: meetingLink })
          .eq("id", groupId);

        if (error) throw error;
      } else if (lessonId && lesson?.video_lessons?.[0]) {
        const { error } = await supabase
          .from("video_lessons")
          .update({ meeting_link: meetingLink })
          .eq("id", lesson.video_lessons[0].id);

        if (error) throw error;
      }

      toast.success("Google Meet link saved!");
    } catch (error: any) {
      toast.error("Failed to save link: " + error.message);
    } finally {
      setSaving(false);
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

  const lessonTitle = group ? group.name : `Lesson with ${lesson?.profiles?.full_name || "Student"}`;
  const lessonTime = lesson ? format(new Date(lesson.scheduled_at), "MMM d, yyyy 'at' h:mm a") : 
                     group ? `${group.scheduled_days?.join(", ")} at ${group.start_time}` : "";

  return (
    <DashboardRoute>
      <div className="container mx-auto p-6 max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-6 h-6" />
              {lessonTitle}
            </CardTitle>
            {lessonTime && <p className="text-sm text-muted-foreground">{lessonTime}</p>}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="meeting-link">Google Meet Link</Label>
              <div className="flex gap-2">
                <Input
                  id="meeting-link"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  type="url"
                />
                <Button onClick={handleSaveLink} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Create a Google Meet from your Gmail account and paste the link here
              </p>
            </div>

            {meetingLink && (
              <Button 
                size="lg" 
                className="w-full"
                onClick={handleJoinMeeting}
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                Join Google Meet
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardRoute>
  );
};

export default VideoLesson;