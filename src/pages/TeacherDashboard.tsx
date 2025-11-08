import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TeacherSidebar } from "@/components/TeacherSidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, Users, Calendar, DollarSign, BookOpen, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TeacherDashboard = () => {
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
    { label: "Active Students", value: "24", icon: Users, color: "text-blue-500" },
    { label: "This Month Lessons", value: "48", icon: Calendar, color: "text-green-500" },
    { label: "Monthly Earnings", value: "$2,340", icon: DollarSign, color: "text-purple-500" },
    { label: "Avg Rating", value: "4.9", icon: TrendingUp, color: "text-yellow-500" },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <TeacherSidebar />
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b bg-card flex items-center px-4 sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <div className="flex-1">
              <h1 className="text-xl font-bold">Teacher Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">{user?.email}</p>
                <div className="flex gap-2">
                  <Badge variant="secondary">Teacher</Badge>
                  {profile?.topik_level && (
                    <Badge>{profile.topik_level}</Badge>
                  )}
                </div>
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
                  Welcome, {profile?.full_name || "Teacher"}! 👨‍🏫
                </h2>
                <p className="text-muted-foreground">
                  Manage your classes and track student progress
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

              {/* Quick Actions */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Today's Schedule
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">1-on-1: Sarah Kim</p>
                        <p className="text-sm text-muted-foreground">10:00 AM - 11:00 AM</p>
                      </div>
                      <Badge>In 2 hours</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">Group Class: Intermediate</p>
                        <p className="text-sm text-muted-foreground">2:00 PM - 3:30 PM</p>
                      </div>
                      <Badge variant="secondary">Today</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">1-on-1: John Park</p>
                        <p className="text-sm text-muted-foreground">4:00 PM - 5:00 PM</p>
                      </div>
                      <Badge variant="secondary">Today</Badge>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-4">
                    View Full Schedule
                  </Button>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-secondary" />
                    Pending Homework
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">Grammar Exercise - Level 3</p>
                        <p className="text-sm text-muted-foreground">8 submissions to review</p>
                      </div>
                      <Badge variant="destructive">New</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">Conversation Recording</p>
                        <p className="text-sm text-muted-foreground">5 submissions to review</p>
                      </div>
                      <Badge variant="destructive">New</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">Vocabulary Quiz</p>
                        <p className="text-sm text-muted-foreground">3 submissions to review</p>
                      </div>
                      <Badge>Pending</Badge>
                    </div>
                  </div>
                  <Button variant="hero" className="w-full mt-4">
                    Review Homework
                  </Button>
                </Card>
              </div>

              {/* Recent Students */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  Recent Student Activity
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold">SK</span>
                      </div>
                      <div>
                        <p className="font-medium">Sarah Kim</p>
                        <p className="text-sm text-muted-foreground">Completed lesson • 2 hours ago</p>
                      </div>
                    </div>
                    <Badge>Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                        <span className="text-sm font-bold">JP</span>
                      </div>
                      <div>
                        <p className="font-medium">John Park</p>
                        <p className="text-sm text-muted-foreground">Submitted homework • 5 hours ago</p>
                      </div>
                    </div>
                    <Badge variant="secondary">New Work</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                        <span className="text-sm font-bold">ML</span>
                      </div>
                      <div>
                        <p className="font-medium">Maria Lee</p>
                        <p className="text-sm text-muted-foreground">Booked new lesson • Yesterday</p>
                      </div>
                    </div>
                    <Badge>Active</Badge>
                  </div>
                </div>
              </Card>

              {/* Earnings Overview */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-purple-500" />
                  Earnings Overview
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">This Week</p>
                    <p className="text-2xl font-bold">$580</p>
                    <p className="text-xs text-green-500 mt-1">+15% from last week</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">This Month</p>
                    <p className="text-2xl font-bold">$2,340</p>
                    <p className="text-xs text-green-500 mt-1">+8% from last month</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Total Earned</p>
                    <p className="text-2xl font-bold">$18,920</p>
                    <p className="text-xs text-muted-foreground mt-1">All time</p>
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

export default TeacherDashboard;