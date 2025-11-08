import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { StudentSidebar } from "@/components/StudentSidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LogOut, Calendar, BookOpen, Trophy, Clock, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const NewStudentDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
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
    setUser(user);

    if (user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setProfile(profileData);
    }
  };

  const loadEnrollments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("enrollments")
      .select(`
        *,
        courses (*)
      `)
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
        enrollments!inner (
          student_id,
          courses (name)
        ),
        profiles!lessons_teacher_id_fkey (full_name)
      `)
      .eq("enrollments.student_id", user.id)
      .eq("status", "scheduled")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(5);

    setUpcomingLessons(data || []);
  };

  const loadHomework = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("homework_assignments")
      .select("*")
      .eq("student_id", user.id)
      .in("status", ["assigned", "submitted"])
      .order("due_date", { ascending: true })
      .limit(5);

    setHomework(data || []);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const stats = [
    { label: "Active Enrollments", value: enrollments.length.toString(), icon: BookOpen, color: "text-blue-500" },
    { label: "Upcoming Lessons", value: upcomingLessons.length.toString(), icon: Calendar, color: "text-purple-500" },
    { label: "Pending Homework", value: homework.filter(h => h.status === "assigned").length.toString(), icon: Trophy, color: "text-orange-500" },
    { label: "TOPIK Level", value: profile?.topik_level || "N/A", icon: Trophy, color: "text-yellow-500" },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <StudentSidebar />
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b bg-card flex items-center px-4 sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <div className="flex-1">
              <h1 className="text-xl font-bold">TOPIK CLUB Student Portal</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">{profile?.full_name || user?.email}</p>
                <Badge variant="secondary">Student</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 bg-gradient-subtle overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Welcome Section */}
              <div>
                <h2 className="text-3xl font-bold mb-2">
                  Welcome back, {profile?.full_name || "Student"}! 👋
                </h2>
                <p className="text-muted-foreground">
                  Your Korean mastery journey with TOPIK CLUB
                </p>
              </div>

              {/* Stats Grid */}
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

              {/* My Enrollments */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  My Courses
                </h3>
                {enrollments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No active enrollments. Browse our courses to get started!</p>
                    <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>
                      Browse Courses
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {enrollments.map((enrollment) => (
                      <div key={enrollment.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{enrollment.courses.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {enrollment.courses.format} • ${enrollment.payment_amount}
                          </p>
                        </div>
                        <Badge variant={enrollment.payment_status === "paid" ? "default" : "secondary"}>
                          {enrollment.payment_status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Upcoming Lessons & Homework Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Upcoming Lessons
                  </h3>
                  {upcomingLessons.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No upcoming lessons scheduled</p>
                  ) : (
                    <div className="space-y-3">
                      {upcomingLessons.map((lesson) => (
                        <div key={lesson.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{lesson.enrollments.courses.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(lesson.scheduled_at), "PPp")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Teacher: {lesson.profiles?.full_name || "TBA"}
                            </p>
                          </div>
                          <Badge variant="secondary">{lesson.lesson_type}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-orange-500" />
                    Pending Homework
                  </h3>
                  {homework.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No pending homework</p>
                  ) : (
                    <div className="space-y-3">
                      {homework.map((hw) => (
                        <div key={hw.id} className="p-3 bg-muted rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-medium">{hw.title}</p>
                            <Badge variant={hw.status === "assigned" ? "destructive" : "secondary"}>
                              {hw.status}
                            </Badge>
                          </div>
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
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default NewStudentDashboard;
