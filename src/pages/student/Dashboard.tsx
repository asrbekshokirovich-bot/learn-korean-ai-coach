import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock } from "lucide-react";
import { format } from "date-fns";

const Dashboard = () => {
  const [upcomingLessons, setUpcomingLessons] = useState<any[]>([]);

  useEffect(() => {
    loadUpcomingLessons();
  }, []);

  const loadUpcomingLessons = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("lessons")
      .select(`
        *,
        enrollments!inner (student_id, courses (name)),
        profiles!lessons_teacher_id_fkey (full_name)
      `)
      .eq("enrollments.student_id", user.id)
      .eq("status", "scheduled")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true });

    setUpcomingLessons(data || []);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">My Lessons</h2>
        <p className="text-muted-foreground">Your upcoming scheduled lessons</p>
      </div>

      {upcomingLessons.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">No upcoming lessons</p>
          <p className="text-sm text-muted-foreground">Check back later or contact your teacher</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {upcomingLessons.map((lesson) => (
            <Card key={lesson.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{lesson.enrollments.courses.name}</h3>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(lesson.scheduled_at), "EEEE, MMMM d, yyyy")}
                    </span>
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {format(new Date(lesson.scheduled_at), "h:mm a")}
                    </span>
                  </div>
                  {lesson.profiles?.full_name && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Teacher: {lesson.profiles.full_name}
                    </p>
                  )}
                </div>
                <Badge>{lesson.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
