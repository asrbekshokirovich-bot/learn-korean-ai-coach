import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { StudentSidebar } from "@/components/StudentSidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LogOut, Flame, BookOpen, Brain, Trophy, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadUserData();
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const stats = [
    { label: "Lessons Completed", value: "12", icon: BookOpen, color: "text-blue-500" },
    { label: "AI Practice Hours", value: "24", icon: Brain, color: "text-purple-500" },
    { label: "Current Streak", value: "7 days", icon: Flame, color: "text-orange-500" },
    { label: "TOPIK Level", value: "3", icon: Trophy, color: "text-yellow-500" },
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
              <h1 className="text-xl font-bold">Student Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">{user?.email}</p>
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
                  Continue your Korean learning journey
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

              {/* Learning Progress */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Learning Progress</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Korean Alphabet (Hangul)</span>
                      <span className="text-sm text-muted-foreground">100%</span>
                    </div>
                    <Progress value={100} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Basic Grammar</span>
                      <span className="text-sm text-muted-foreground">75%</span>
                    </div>
                    <Progress value={75} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Vocabulary (Level 2)</span>
                      <span className="text-sm text-muted-foreground">60%</span>
                    </div>
                    <Progress value={60} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Conversation Practice</span>
                      <span className="text-sm text-muted-foreground">45%</span>
                    </div>
                    <Progress value={45} />
                  </div>
                </div>
              </Card>

              {/* Quick Actions */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Upcoming Lessons
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">1-on-1 with Teacher Kim</p>
                        <p className="text-sm text-muted-foreground">Tomorrow, 2:00 PM</p>
                      </div>
                      <Badge>Confirmed</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">Group Class: Conversation</p>
                        <p className="text-sm text-muted-foreground">Friday, 4:00 PM</p>
                      </div>
                      <Badge variant="secondary">Upcoming</Badge>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-4">
                    View All Lessons
                  </Button>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-500" />
                    AI Practice Sessions
                  </h3>
                  <div className="space-y-3">
                    <Button variant="hero" className="w-full justify-start">
                      <Brain className="w-4 h-4 mr-2" />
                      Start AI Conversation
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Pronunciation Practice
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Trophy className="w-4 h-4 mr-2" />
                      TOPIK Mock Test
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <div className="flex-1">
                      <p className="font-medium">Completed Grammar Quiz</p>
                      <p className="text-sm text-muted-foreground">2 hours ago · Score: 95%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Brain className="w-5 h-5 text-purple-500" />
                    <div className="flex-1">
                      <p className="font-medium">AI Practice Session</p>
                      <p className="text-sm text-muted-foreground">Yesterday · 30 minutes</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <BookOpen className="w-5 h-5 text-blue-500" />
                    <div className="flex-1">
                      <p className="font-medium">Lesson with Teacher Park</p>
                      <p className="text-sm text-muted-foreground">2 days ago · Completed</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default StudentDashboard;