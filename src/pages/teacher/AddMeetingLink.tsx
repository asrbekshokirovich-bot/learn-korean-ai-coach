import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Video, ArrowLeft, Link as LinkIcon, Calendar, Clock, Users } from "lucide-react";
import { format } from "date-fns";

const AddMeetingLink = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<any[]>([]);
  const [upcomingLessons, setUpcomingLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingLinks, setSavingLinks] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTeacherData();
  }, []);

  const loadTeacherData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load active groups
      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select("*, group_enrollments(count)")
        .eq("teacher_id", user.id)
        .eq("status", "active");

      if (groupsError) throw groupsError;

      // Load upcoming 1:1 lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from("lessons")
        .select(`
          *,
          video_lessons(*),
          profiles!lessons_student_id_fkey(full_name)
        `)
        .eq("teacher_id", user.id)
        .in("status", ["scheduled", "active"])
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(10);

      if (lessonsError) throw lessonsError;

      setGroups(groupsData || []);
      setUpcomingLessons(lessonsData || []);
    } catch (error: any) {
      toast.error("Failed to load data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGroupLink = async (groupId: string, meetingLink: string) => {
    if (!meetingLink.trim()) {
      toast.error("Please enter a valid Google Meet link");
      return;
    }

    setSavingLinks(prev => new Set(prev).add(groupId));

    try {
      const { error } = await supabase
        .from("groups")
        .update({ meeting_link: meetingLink })
        .eq("id", groupId);

      if (error) throw error;

      toast.success("Google Meet link saved!");
      setGroups(prev => prev.map(g => 
        g.id === groupId ? { ...g, meeting_link: meetingLink } : g
      ));
    } catch (error: any) {
      toast.error("Failed to save link: " + error.message);
    } finally {
      setSavingLinks(prev => {
        const next = new Set(prev);
        next.delete(groupId);
        return next;
      });
    }
  };

  const handleSaveLessonLink = async (lessonId: string, videoLessonId: string, meetingLink: string) => {
    if (!meetingLink.trim()) {
      toast.error("Please enter a valid Google Meet link");
      return;
    }

    setSavingLinks(prev => new Set(prev).add(lessonId));

    try {
      const { error } = await supabase
        .from("video_lessons")
        .update({ meeting_link: meetingLink })
        .eq("id", videoLessonId);

      if (error) throw error;

      toast.success("Google Meet link saved!");
      setUpcomingLessons(prev => prev.map(lesson => 
        lesson.id === lessonId 
          ? { 
              ...lesson, 
              video_lessons: lesson.video_lessons.map((vl: any) => 
                vl.id === videoLessonId ? { ...vl, meeting_link: meetingLink } : vl
              )
            } 
          : lesson
      ));
    } catch (error: any) {
      toast.error("Failed to save link: " + error.message);
    } finally {
      setSavingLinks(prev => {
        const next = new Set(prev);
        next.delete(lessonId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Manage Google Meet Links</h1>
          <p className="text-muted-foreground">Add Google Meet links for your lessons and groups</p>
        </div>
      </div>

      {/* Group Lessons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Group Lessons
          </CardTitle>
          <CardDescription>
            Add permanent Google Meet links for your group classes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {groups.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No active groups found</p>
          ) : (
            groups.map((group) => (
              <GroupLinkCard
                key={group.id}
                group={group}
                saving={savingLinks.has(group.id)}
                onSave={handleSaveGroupLink}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* 1:1 Lessons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Upcoming 1:1 Lessons
          </CardTitle>
          <CardDescription>
            Add Google Meet links for individual lessons
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {upcomingLessons.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No upcoming lessons found</p>
          ) : (
            upcomingLessons.map((lesson) => (
              <LessonLinkCard
                key={lesson.id}
                lesson={lesson}
                saving={savingLinks.has(lesson.id)}
                onSave={handleSaveLessonLink}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const GroupLinkCard = ({ group, saving, onSave }: any) => {
  const [link, setLink] = useState(group.meeting_link || "");

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg">{group.name}</h3>
          <p className="text-sm text-muted-foreground">
            {group.level} • {group.scheduled_days?.join(", ")} at {group.start_time}
          </p>
        </div>
        {group.meeting_link && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(group.meeting_link, "_blank")}
          >
            <LinkIcon className="w-4 h-4 mr-2" />
            Test Link
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor={`group-${group.id}`} className="sr-only">Google Meet Link</Label>
          <Input
            id={`group-${group.id}`}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://meet.google.com/xxx-xxxx-xxx"
            type="url"
          />
        </div>
        <Button
          onClick={() => onSave(group.id, link)}
          disabled={saving || !link.trim() || link === group.meeting_link}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
};

const LessonLinkCard = ({ lesson, saving, onSave }: any) => {
  const videoLesson = lesson.video_lessons?.[0];
  const [link, setLink] = useState(videoLesson?.meeting_link || "");
  const studentName = lesson.profiles?.full_name || "Unknown Student";

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{studentName}</h3>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(lesson.scheduled_at), "MMM d, yyyy")}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {format(new Date(lesson.scheduled_at), "h:mm a")}
            </span>
          </div>
        </div>
        {videoLesson?.meeting_link && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(videoLesson.meeting_link, "_blank")}
          >
            <LinkIcon className="w-4 h-4 mr-2" />
            Test Link
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor={`lesson-${lesson.id}`} className="sr-only">Google Meet Link</Label>
          <Input
            id={`lesson-${lesson.id}`}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://meet.google.com/xxx-xxxx-xxx"
            type="url"
          />
        </div>
        <Button
          onClick={() => onSave(lesson.id, videoLesson?.id, link)}
          disabled={saving || !link.trim() || link === videoLesson?.meeting_link || !videoLesson}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
};

export default AddMeetingLink;
