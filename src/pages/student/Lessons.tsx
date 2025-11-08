import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const Lessons = () => {
  const [upcomingLessons, setUpcomingLessons] = useState<any[]>([]);
  const [completedLessons, setCompletedLessons] = useState<any[]>([]);
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
        enrollments!inner (
          student_id,
          courses (name)
        ),
        profiles!lessons_teacher_id_fkey (full_name)
      `)
      .eq("enrollments.student_id", user.id)
      .eq("status", "scheduled")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true });

    setUpcomingLessons(upcoming || []);

    // Completed lessons
    const { data: completed } = await supabase
      .from("lessons")
      .select(`
        *,
        enrollments!inner (
          student_id,
          courses (name)
        ),
        profiles!lessons_teacher_id_fkey (full_name)
      `)
      .eq("enrollments.student_id", user.id)
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
                    <h4 className="font-semibold text-lg">{lesson.enrollments.courses.name}</h4>
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
                {lesson.meeting_link && (
                  <Button size="sm" className="w-full" onClick={() => window.open(lesson.meeting_link, "_blank")}>
                    <Video className="w-4 h-4 mr-2" />
                    Join Lesson
                  </Button>
                )}
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
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{lesson.enrollments.courses.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(lesson.scheduled_at), "PPP")} • {lesson.profiles?.full_name}
                    </p>
                  </div>
                  <Badge variant="secondary">Completed</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Lessons;
