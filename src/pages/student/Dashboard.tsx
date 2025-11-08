import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, BookOpen, Trophy, Clock } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [upcomingLessons, setUpcomingLessons] = useState<any[]>([]);
  const [homework, setHomework] = useState<any[]>([]);

  useEffect(() => {
    loadUserData();
    loadEnrollments();
    loadUpcomingLessons();
    loadHomework();
  }, []);

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    setProfile(profileData);
  };

  const loadEnrollments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("enrollments")
      .select("*, courses (*)")
      .eq("student_id", user.id)
      .eq("status", "active");

    setEnrollments(data || []);
  };

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
      .order("scheduled_at", { ascending: true })
      .limit(3);

    setUpcomingLessons(data || []);
  };

  const loadHomework = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("homework_assignments")
      .select("*")
      .eq("student_id", user.id)
      .eq("status", "assigned")
      .order("due_date", { ascending: true })
      .limit(3);

    setHomework(data || []);
  };

  const stats = [
    { label: "Active Courses", value: enrollments.length.toString(), icon: BookOpen, color: "text-blue-500" },
    { label: "Upcoming Lessons", value: upcomingLessons.length.toString(), icon: Calendar, color: "text-purple-500" },
    { label: "Pending Homework", value: homework.length.toString(), icon: Trophy, color: "text-orange-500" },
    { label: "TOPIK Level", value: profile?.topik_level || "N/A", icon: Trophy, color: "text-yellow-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-3xl font-bold mb-2">
          Welcome back, {profile?.full_name || "Student"}! 👋
        </h2>
        <p className="text-muted-foreground">Your Korean mastery journey with TOPIK CLUB</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Upcoming Lessons</h3>
          {upcomingLessons.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming lessons</p>
          ) : (
            <div className="space-y-3">
              {upcomingLessons.map((lesson) => (
                <div key={lesson.id} className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{lesson.enrollments.courses.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(lesson.scheduled_at), "PPp")}
                  </p>
                </div>
              ))}
            </div>
          )}
          <Button variant="outline" className="w-full mt-4" onClick={() => navigate("/student/lessons")}>
            View All Lessons
          </Button>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Pending Homework</h3>
          {homework.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending homework</p>
          ) : (
            <div className="space-y-3">
              {homework.map((hw) => (
                <div key={hw.id} className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{hw.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Due: {hw.due_date ? format(new Date(hw.due_date), "PPp") : "No deadline"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
