import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, DollarSign, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

const NewTeacherDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [todayLessons, setTodayLessons] = useState<any[]>([]);
  const [pendingHomework, setPendingHomework] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any>(null);
  const [studentCount, setStudentCount] = useState(0);

  useEffect(() => {
    loadUserData();
    loadTodayLessons();
    loadPendingHomework();
    loadEarnings();
    loadStudentCount();
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

  const loadTodayLessons = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    const { data } = await supabase
      .from("lessons")
      .select(`
        *,
        enrollments (
          profiles!enrollments_student_id_fkey (full_name),
          courses (name)
        )
      `)
      .eq("teacher_id", user.id)
      .gte("scheduled_at", startOfDay)
      .lte("scheduled_at", endOfDay)
      .order("scheduled_at", { ascending: true });

    setTodayLessons(data || []);
  };

  const loadPendingHomework = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("homework_assignments")
      .select(`
        *,
        profiles!homework_assignments_student_id_fkey (full_name)
      `)
      .eq("teacher_id", user.id)
      .eq("status", "submitted")
      .order("created_at", { ascending: false })
      .limit(10);

    setPendingHomework(data || []);
  };

  const loadEarnings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("teacher_payouts")
      .select("*")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    setEarnings(data);
  };

  const loadStudentCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("lessons")
      .select("enrollments (student_id)")
      .eq("teacher_id", user.id)
      .eq("status", "completed");

    if (data) {
      const uniqueStudents = new Set(data.map((l: any) => l.enrollments?.student_id));
      setStudentCount(uniqueStudents.size);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const stats = [
    { label: t('activeStudents'), value: studentCount.toString(), icon: Users, color: "text-blue-500" },
    { label: t('todayLessons'), value: todayLessons.length.toString(), icon: Calendar, color: "text-purple-500" },
    { label: t('currentPayout'), value: `$${earnings?.payout_amount || 0}`, icon: DollarSign, color: "text-green-500" },
    { label: t('pendingReviews'), value: pendingHomework.length.toString(), icon: BookOpen, color: "text-orange-500" },
  ];

  return (
    <div className="flex min-h-screen w-full">
      <div className="flex-1 flex flex-col">
        {/* Main Content */}
        <main className="flex-1 p-6 bg-gradient-subtle overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Welcome Section */}
            <div>
              <h2 className="text-3xl font-bold mb-2">
                {t('welcome')}, {profile?.full_name || "Teacher"}! 👋
              </h2>
              <p className="text-muted-foreground">
                {t('yourTeachingDashboard')}
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

              {/* Today's Schedule & Pending Homework */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    {t('todaySchedule')}
                  </h3>
                  {todayLessons.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('noLessonsToday')}</p>
                  ) : (
                    <div className="space-y-3">
                      {todayLessons.map((lesson) => (
                        <div key={lesson.id} className="p-3 bg-muted rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium">
                                {lesson.enrollments?.profiles?.full_name || "Student"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {lesson.enrollments?.courses?.name}
                              </p>
                            </div>
                            <Badge variant="secondary">{lesson.lesson_type}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(lesson.scheduled_at), "h:mm a")} • {lesson.duration_minutes} min
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-orange-500" />
                    {t('pendingHomeworkReviews')}
                  </h3>
                  {pendingHomework.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('noPendingHomework')}</p>
                  ) : (
                    <div className="space-y-3">
                      {pendingHomework.slice(0, 5).map((hw) => (
                        <div key={hw.id} className="p-3 bg-muted rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium">{hw.title}</p>
                              <p className="text-xs text-muted-foreground">
                                Student: {hw.profiles?.full_name || "Unknown"}
                              </p>
                            </div>
                            <Badge variant="destructive">{t('review')}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {t('submitted')}: {format(new Date(hw.created_at), "PPp")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/* Earnings Overview */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  {t('earningsOverview')}
                </h3>
                {earnings ? (
                  <div className="grid md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('period')}</p>
                      <p className="font-medium">
                        {format(new Date(earnings.period_start), "MMM d")} - {format(new Date(earnings.period_end), "MMM d")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('totalRevenue')}</p>
                      <p className="font-medium">${earnings.total_revenue}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('yourPayout')}</p>
                      <p className="font-medium text-green-600">${earnings.payout_amount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('lessonsTaught')}</p>
                      <p className="font-medium">{earnings.lessons_count}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('noPayoutData')}</p>
                )}
                <p className="text-xs text-muted-foreground mt-4">
                  {t('revenueNote')}
                </p>
              </Card>
            </div>
          </main>
        </div>
      </div>
  );
};

export default NewTeacherDashboard;
