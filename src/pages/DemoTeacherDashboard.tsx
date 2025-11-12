import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import hangukLogo from "@/assets/hanguk-logo-icon.png";

const DemoTeacherDashboard = () => {
  const navigate = useNavigate();
  const [demoLessons, setDemoLessons] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
    loadDemoLessons();
  }, []);

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadDemoLessons = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("demo_lessons")
        .select(`
          *,
          profiles!demo_lessons_student_id_fkey(full_name, email)
        `)
        .eq("coordinator_id", user.id)
        .order("scheduled_at", { ascending: true });

      if (error) throw error;

      setDemoLessons(data || []);
    } catch (error: any) {
      toast.error("Failed to load demo lessons");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const updateLessonStatus = async (lessonId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("demo_lessons")
        .update({ status })
        .eq("id", lessonId);

      if (error) throw error;

      toast.success(`Demo lesson marked as ${status}`);
      loadDemoLessons();
    } catch (error: any) {
      toast.error("Failed to update lesson status");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={hangukLogo} alt="Hanguk" className="h-14 w-auto" />
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">My Demo Lessons</h2>
          <p className="text-muted-foreground">
            Conduct demo lessons and assess student levels
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : demoLessons.length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No Demo Lessons Scheduled</h3>
            <p className="text-muted-foreground">
              You don't have any demo lessons assigned yet.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {demoLessons.map((lesson) => (
              <Card key={lesson.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4" />
                      <h3 className="text-lg font-semibold">
                        {lesson.profiles?.full_name || 'Unknown Student'}
                      </h3>
                      <Badge className={getStatusColor(lesson.status)}>
                        {lesson.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {lesson.profiles?.email}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(lesson.scheduled_at), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(lesson.scheduled_at), 'h:mm a')}</span>
                  </div>
                </div>

                {lesson.detected_level && (
                  <div className="mb-4">
                    <p className="text-sm font-medium">Detected Level:</p>
                    <Badge variant="outline">{lesson.detected_level}</Badge>
                  </div>
                )}

                {lesson.coordinator_notes && (
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-1">Notes:</p>
                    <p className="text-sm text-muted-foreground">{lesson.coordinator_notes}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {lesson.status === 'scheduled' && (
                    <Button
                      onClick={() => updateLessonStatus(lesson.id, 'in_progress')}
                      variant="default"
                    >
                      Start Lesson
                    </Button>
                  )}
                  {lesson.status === 'in_progress' && (
                    <Button
                      onClick={() => updateLessonStatus(lesson.id, 'completed')}
                      variant="default"
                    >
                      Mark Complete
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DemoTeacherDashboard;
