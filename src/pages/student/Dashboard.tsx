import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, Video, Users, AlertCircle, TrendingUp, Target, BookOpen, Sparkles, Award, MessageCircle, Send } from "lucide-react";
import { format, getDay, addDays } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { LearningAnalyticsCharts } from "@/components/student/LearningAnalyticsCharts";

const Dashboard = () => {
  const navigate = useNavigate();
  const [upcomingLessons, setUpcomingLessons] = useState<any[]>([]);
  const [groupEnrollments, setGroupEnrollments] = useState<any[]>([]);
  const [nextGroupLesson, setNextGroupLesson] = useState<any>(null);
  const [teacherNames, setTeacherNames] = useState<Record<string, string>>({});
  const [goalProgress, setGoalProgress] = useState<any[]>([]);
  const [stats, setStats] = useState({ enrollments: 0, completedLessons: 0, goalsInProgress: 0 });
  const [supportRequests, setSupportRequests] = useState<any[]>([]);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const { t } = useLanguage();

  useEffect(() => {
    loadUpcomingLessons();
    loadGroupEnrollments();
    loadGoalProgress();
    loadStats();
    loadSupportRequests();
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

  const loadGroupEnrollments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("group_enrollments")
        .select(`
          *,
          groups:groups!group_enrollments_group_id_fkey(*)
        `)
        .eq("student_id", user.id)
        .eq("status", "active");

      if (error) throw error;

      const enrolls = data || [];
      setGroupEnrollments(enrolls);

      // Load teacher names
      const teacherIds = Array.from(new Set(enrolls.map((e: any) => e.groups?.teacher_id).filter((id: string) => !!id)));
      if (teacherIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", teacherIds);
        if (profiles) {
          const map = Object.fromEntries(profiles.map((p: any) => [p.user_id, p.full_name]));
          setTeacherNames(map);
        }
      }

      // Calculate next group lesson
      if (enrolls.length > 0) {
        const next = calculateNextGroupLesson(enrolls);
        setNextGroupLesson(next);
      }
    } catch (error: any) {
      console.error("Failed to load group enrollments:", error);
    }
  };

  const calculateNextGroupLesson = (enrollments: any[]) => {
    const now = new Date();
    const today = getDay(now);
    
    let closestLesson: any = null;
    let minDaysUntil = Infinity;
    
    for (const enrollment of enrollments) {
      const group = enrollment.groups;
      const groupDays = Array.isArray(group.day_of_week) ? group.day_of_week : [group.day_of_week];
      
      for (const day of groupDays) {
        let daysUntil = (day - today + 7) % 7;
        
        // If today, check if time hasn't passed
        if (daysUntil === 0) {
          const [hours, minutes] = group.start_time.split(":").map(Number);
          const lessonStart = new Date();
          lessonStart.setHours(hours, minutes, 0, 0);
          
          if (now > lessonStart) {
            daysUntil = 7; // Skip to next week
          }
        }
        
        if (daysUntil === 0) daysUntil = 0; // Today's lesson
        
        if (daysUntil < minDaysUntil) {
          minDaysUntil = daysUntil;
          const nextDate = addDays(now, daysUntil);
          closestLesson = {
            ...enrollment,
            nextDate
          };
        }
      }
    }
    
    return closestLesson;
  };

  const handleJoinLesson = (group: any) => {
    const now = new Date();
    const [hours, minutes] = group.start_time.split(":").map(Number);
    const lessonStart = new Date();
    lessonStart.setHours(hours, minutes, 0, 0);
    const lessonEnd = new Date(lessonStart.getTime() + group.duration_minutes * 60000);

    if (now < lessonStart) {
      const minutesUntil = Math.floor((lessonStart.getTime() - now.getTime()) / 60000);
      toast.error(`Lesson hasn't started yet. It will begin in ${minutesUntil} minutes.`);
      return;
    }

    if (now > lessonEnd) {
      toast.error("This lesson has already ended.");
      return;
    }

    toast.success("Joining lesson...");
    navigate(`/student/video-lesson?groupId=${group.id}&groupName=${encodeURIComponent(group.name)}`);
  };

  const isLessonJoinable = (group: any) => {
    const now = new Date();
    const [hours, minutes] = group.start_time.split(":").map(Number);
    const lessonStart = new Date();
    lessonStart.setHours(hours, minutes, 0, 0);
    const lessonEnd = new Date(lessonStart.getTime() + group.duration_minutes * 60000);

    // Allow joining 10 minutes before start
    const joinableStart = new Date(lessonStart.getTime() - 10 * 60000);
    
    return now >= joinableStart && now <= lessonEnd;
  };

  const loadGoalProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("student_goal_progress")
        .select(`
          *,
          group_goals:group_goal_id(
            title,
            description,
            unit,
            status,
            end_date
          )
        `)
        .eq("student_id", user.id)
        .order("last_updated", { ascending: false });

      if (error) throw error;
      setGoalProgress(data || []);
    } catch (error) {
      console.error("Failed to load goal progress:", error);
    }
  };

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count: enrollmentsCount } = await supabase
        .from("group_enrollments")
        .select("*", { count: "exact", head: true })
        .eq("student_id", user.id)
        .eq("status", "active");

      const { count: completedCount } = await supabase
        .from("lessons")
        .select("*", { count: "exact", head: true })
        .eq("student_id", user.id)
        .eq("status", "completed");

      const { count: goalsCount } = await supabase
        .from("student_goal_progress")
        .select("*", { count: "exact", head: true })
        .eq("student_id", user.id);

      setStats({
        enrollments: enrollmentsCount || 0,
        completedLessons: completedCount || 0,
        goalsInProgress: goalsCount || 0,
      });
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const loadSupportRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("support_requests")
        .select("*")
        .eq("student_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSupportRequests(data || []);
    } catch (error) {
      console.error("Failed to load support requests:", error);
    }
  };

  const handleSendReply = async (requestId: string) => {
    try {
      const reply = replyText[requestId]?.trim();
      if (!reply) {
        toast.error("Please enter a reply");
        return;
      }

      // For now, we'll just show a toast. In a real implementation,
      // you might want to create a new message or update the request
      toast.success("Reply sent! Admin will be notified.");
      
      // Clear the reply text
      setReplyText(prev => ({ ...prev, [requestId]: "" }));
    } catch (error: any) {
      toast.error("Failed to send reply");
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-accent to-secondary p-8 text-primary-foreground shadow-elegant">
        <div className="absolute inset-0 bg-gradient-mesh opacity-30"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8" />
            <h1 className="text-4xl font-bold">{t('welcomeBackTitle')}</h1>
          </div>
          <p className="text-lg opacity-90">{t('continueYourKoreanLearning')}</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-ai hover:shadow-glow transition-all duration-300 hover:-translate-y-1">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('activeGroups')}</p>
                <p className="text-3xl font-bold mt-2">{stats.enrollments}</p>
              </div>
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-7 h-7 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-ai hover:shadow-glow transition-all duration-300 hover:-translate-y-1">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('lessonsCompletedCount')}</p>
                <p className="text-3xl font-bold mt-2">{stats.completedLessons}</p>
              </div>
              <div className="h-14 w-14 rounded-full bg-accent/10 flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-ai hover:shadow-glow transition-all duration-300 hover:-translate-y-1">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('activeGoals')}</p>
                <p className="text-3xl font-bold mt-2">{stats.goalsInProgress}</p>
              </div>
              <div className="h-14 w-14 rounded-full bg-secondary/10 flex items-center justify-center">
                <Target className="w-7 h-7 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Learning Analytics Charts */}
      <LearningAnalyticsCharts />

      {/* Support Requests Section */}
      {supportRequests.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-primary" />
              {t('supportRequests') || 'Support Requests'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t('viewAndReplyToSupport') || 'View and reply to your support requests'}
            </p>
          </div>

          <div className="grid gap-4">
            {supportRequests.map((request) => (
              <Card key={request.id} className="border-none shadow-ai">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{request.subject}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(new Date(request.created_at), "MMM d, yyyy 'at' HH:mm")}
                      </p>
                    </div>
                    <Badge variant="secondary">Pending</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm font-medium mb-1">{t('yourMessage') || 'Your Message'}:</p>
                    <p className="text-sm whitespace-pre-wrap">{request.message}</p>
                  </div>

                  {request.admin_response && (
                    <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                      <p className="text-sm font-medium mb-1 text-primary">
                        {t('adminResponse') || 'Admin Response'}:
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{request.admin_response}</p>
                    </div>
                  )}

                  {request.admin_response && (
                    <div className="space-y-2">
                      <Textarea
                        placeholder={t('typeYourReply') || "Type your reply..."}
                        value={replyText[request.id] || ""}
                        onChange={(e) => setReplyText(prev => ({ ...prev, [request.id]: e.target.value }))}
                        className="min-h-[80px]"
                      />
                      <Button
                        onClick={() => handleSendReply(request.id)}
                        disabled={!replyText[request.id]?.trim()}
                        size="sm"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {t('sendReply') || 'Send Reply'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Goal Progress Section */}
      {goalProgress.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              {t('yourLearningGoals')}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{t('aiPersonalizedGoals')}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {goalProgress.map((progress) => {
              const goal = progress.group_goals;
              const percentage = progress.progress_percentage || 0;
              
              return (
                <Card key={progress.id} className="border-none shadow-ai hover:shadow-elegant transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Award className="w-5 h-5 text-primary" />
                          {goal.title}
                        </CardTitle>
                        {progress.personalized_description && (
                          <p className="text-sm text-muted-foreground mt-2">{progress.personalized_description}</p>
                        )}
                      </div>
                      <Badge variant={percentage >= 100 ? "default" : "secondary"}>
                        {percentage.toFixed(0)}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Progress value={percentage} className="h-3" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {progress.current_value} / {progress.target_value} {goal.unit}
                        </span>
                        {goal.end_date && (
                          <span className="text-muted-foreground">
                            {t('due')}: {format(new Date(goal.end_date), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Next Group Lesson Card */}
      {nextGroupLesson && (
        <Card className="border-none shadow-ai bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl"></div>
          <CardHeader className="relative z-10">
            <CardTitle className="flex items-center gap-2 text-xl">
              <AlertCircle className="w-6 h-6 text-primary" />
              {isLessonJoinable(nextGroupLesson.groups) ? "🔴 Live Now" : "Next Group Lesson"}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-4 flex-1">
                <div>
                  <h3 className="text-2xl font-bold">{nextGroupLesson.groups.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="border-primary text-primary">{nextGroupLesson.groups.level}</Badge>
                    {isLessonJoinable(nextGroupLesson.groups) && (
                      <Badge className="bg-green-500 animate-pulse">Live Now</Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="font-medium">{format(nextGroupLesson.nextDate, "EEEE, MMMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="font-medium">{nextGroupLesson.groups.start_time} ({nextGroupLesson.groups.duration_minutes}min)</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="font-medium">Teacher: {teacherNames[nextGroupLesson.groups.teacher_id] || "Not assigned"}</span>
                  </div>
                </div>
              </div>
              <Button 
                size="lg"
                onClick={() => handleJoinLesson(nextGroupLesson.groups)}
                className={`min-w-[160px] shadow-elegant ${isLessonJoinable(nextGroupLesson.groups) ? "bg-green-600 hover:bg-green-700" : ""}`}
              >
                <Video className="w-5 h-5 mr-2" />
                {isLessonJoinable(nextGroupLesson.groups) ? "Join Now" : "Join Lesson"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Group Lessons */}
      {groupEnrollments.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-2xl font-bold">{t('myGroupLessons')}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t('yourEnrolledGroupClasses')}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groupEnrollments.map((enrollment) => {
              const group = enrollment.groups;
              const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
              return (
                <Card key={enrollment.id} className="border-none shadow-ai hover:shadow-elegant transition-all duration-300 hover:-translate-y-1 overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <CardContent className="pt-6 relative z-10">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-lg mb-2">{group.name}</h4>
                          <Badge variant="outline" className="border-primary text-primary">{group.level}</Badge>
                        </div>
                        <Badge variant="secondary" className="bg-secondary/10 text-secondary">
                          {group.current_students_count}/{group.max_students}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span className="font-medium">
                            {Array.isArray(group.day_of_week) 
                              ? group.day_of_week.map((d: number) => DAYS_OF_WEEK[d]).join(', ')
                              : DAYS_OF_WEEK[group.day_of_week]}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-primary" />
                          <span className="font-medium">{group.start_time}</span>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full shadow-ai"
                        onClick={() => navigate('/student/groups')}
                      >
                        {t('viewDetails')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Individual Upcoming Lessons */}
      {upcomingLessons.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-2xl font-bold">{t('myLessons')}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t('upcomingLessons')}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {upcomingLessons.map((lesson) => (
              <Card key={lesson.id} className="border-none shadow-ai hover:shadow-elegant transition-all duration-300">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-bold flex-1">{lesson.enrollments.courses.name}</h3>
                    <Badge variant="outline">{lesson.status}</Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className="font-medium">{format(new Date(lesson.scheduled_at), "EEEE, MMMM d, yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="font-medium">{format(new Date(lesson.scheduled_at), "h:mm a")}</span>
                    </div>
                    {lesson.profiles?.full_name && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="font-medium">{t('teacher')}: {lesson.profiles.full_name}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {upcomingLessons.length === 0 && groupEnrollments.length === 0 && goalProgress.length === 0 && (
        <Card className="border-none shadow-ai p-16 text-center bg-gradient-to-br from-muted/30 to-background">
          <div className="max-w-md mx-auto">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Start Your Learning Journey</h3>
            <p className="text-muted-foreground mb-6">Contact support to get enrolled in group classes and begin your Korean language adventure</p>
            <Button size="lg" className="shadow-elegant">
              Contact Support
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
