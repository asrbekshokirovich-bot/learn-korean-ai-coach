import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, DollarSign } from "lucide-react";
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
  const [earnings, setEarnings] = useState<any>(null);
  const [studentCount, setStudentCount] = useState(0);

  useEffect(() => {
    loadUserData();
    loadTodayLessons();
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
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Load group lessons for today
    const { data: groupData } = await supabase
      .from("groups")
      .select("*")
      .eq("teacher_id", user.id)
      .eq("status", "active");

    // Filter groups that have lessons today
    const todayGroups = (groupData || []).filter((group) => {
      if (Array.isArray(group.day_of_week)) {
        return group.day_of_week.includes(dayOfWeek);
      }
      return group.day_of_week === dayOfWeek;
    });

    setTodayLessons(todayGroups);
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
      .maybeSingle();

    setEarnings(data);
  };

  const loadStudentCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get unique students from group enrollments where teacher teaches
    const { data: groupData } = await supabase
      .from("groups")
      .select("id")
      .eq("teacher_id", user.id)
      .eq("status", "active");

    if (!groupData || groupData.length === 0) {
      setStudentCount(0);
      return;
    }

    const groupIds = groupData.map(g => g.id);

    const { data: enrollmentData } = await supabase
      .from("group_enrollments")
      .select("student_id")
      .in("group_id", groupIds)
      .eq("status", "active");

    if (enrollmentData) {
      const uniqueStudents = new Set(enrollmentData.map(e => e.student_id));
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
              <div className="grid md:grid-cols-3 gap-4">
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

              {/* Today's Schedule */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  {t('todaySchedule')}
                </h3>
                {todayLessons.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('noLessonsToday')}</p>
                ) : (
                  <div className="space-y-3">
                    {todayLessons.map((group) => (
                      <div key={group.id} className="p-3 bg-muted rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium">{group.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {group.current_students_count} / {group.max_students} students
                            </p>
                          </div>
                          <Badge variant="secondary">{group.level}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {group.start_time} • {group.duration_minutes} min
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

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
