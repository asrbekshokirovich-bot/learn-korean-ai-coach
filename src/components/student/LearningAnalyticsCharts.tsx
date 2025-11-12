import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, Calendar, Target, BookOpen } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

interface AnalyticsData {
  attendanceData: any[];
  homeworkData: any[];
  goalData: any[];
}

export const LearningAnalyticsCharts = () => {
  const { t } = useLanguage();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    attendanceData: [],
    homeworkData: [],
    goalData: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get last 6 months
      const endDate = new Date();
      const startDate = subMonths(endDate, 5);
      const months = eachMonthOfInterval({ start: startDate, end: endDate });

      // Load lesson attendance data
      const attendancePromises = months.map(async (month) => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        const { count: completedCount } = await supabase
          .from("lessons")
          .select("*", { count: "exact", head: true })
          .eq("student_id", user.id)
          .eq("status", "completed")
          .gte("scheduled_at", monthStart.toISOString())
          .lte("scheduled_at", monthEnd.toISOString());

        const { count: totalCount } = await supabase
          .from("lessons")
          .select("*", { count: "exact", head: true })
          .eq("student_id", user.id)
          .gte("scheduled_at", monthStart.toISOString())
          .lte("scheduled_at", monthEnd.toISOString());

        return {
          month: format(month, "MMM yyyy"),
          completed: completedCount || 0,
          total: totalCount || 0,
          rate: totalCount ? Math.round((completedCount || 0) / totalCount * 100) : 0,
        };
      });

      // Load homework completion data
      const homeworkPromises = months.map(async (month) => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        const { count: submittedCount } = await supabase
          .from("homework_assignments")
          .select("*", { count: "exact", head: true })
          .eq("student_id", user.id)
          .eq("status", "submitted")
          .gte("created_at", monthStart.toISOString())
          .lte("created_at", monthEnd.toISOString());

        const { count: totalCount } = await supabase
          .from("homework_assignments")
          .select("*", { count: "exact", head: true })
          .eq("student_id", user.id)
          .gte("created_at", monthStart.toISOString())
          .lte("created_at", monthEnd.toISOString());

        const { data: grades } = await supabase
          .from("homework_assignments")
          .select("ai_grade, teacher_grade")
          .eq("student_id", user.id)
          .not("ai_grade", "is", null)
          .gte("created_at", monthStart.toISOString())
          .lte("created_at", monthEnd.toISOString());

        const avgGrade = grades && grades.length > 0
          ? Math.round(grades.reduce((sum, g) => sum + (g.teacher_grade || g.ai_grade || 0), 0) / grades.length)
          : 0;

        return {
          month: format(month, "MMM yyyy"),
          submitted: submittedCount || 0,
          total: totalCount || 0,
          rate: totalCount ? Math.round((submittedCount || 0) / totalCount * 100) : 0,
          avgGrade,
        };
      });

      // Load goal progress data
      const goalPromises = months.map(async (month) => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        const { data: goals } = await supabase
          .from("student_goal_progress")
          .select("progress_percentage")
          .eq("student_id", user.id)
          .gte("last_updated", monthStart.toISOString())
          .lte("last_updated", monthEnd.toISOString());

        const avgProgress = goals && goals.length > 0
          ? Math.round(goals.reduce((sum, g) => sum + (g.progress_percentage || 0), 0) / goals.length)
          : 0;

        const { count: completedGoals } = await supabase
          .from("student_goal_progress")
          .select("*", { count: "exact", head: true })
          .eq("student_id", user.id)
          .gte("progress_percentage", 100)
          .gte("last_updated", monthStart.toISOString())
          .lte("last_updated", monthEnd.toISOString());

        return {
          month: format(month, "MMM yyyy"),
          progress: avgProgress,
          completed: completedGoals || 0,
        };
      });

      const [attendance, homework, goals] = await Promise.all([
        Promise.all(attendancePromises),
        Promise.all(homeworkPromises),
        Promise.all(goalPromises),
      ]);

      setAnalyticsData({
        attendanceData: attendance,
        homeworkData: homework,
        goalData: goals,
      });
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
          <p className="font-semibold mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}{entry.unit || ""}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="border-none shadow-ai">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-ai overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
        <CardTitle className="flex items-center gap-2 text-xl">
          <TrendingUp className="w-6 h-6 text-primary" />
          {t('learningProgressAnalytics')}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">{t('trackPerformance')}</p>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs defaultValue="attendance" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">{t('attendance')}</span>
            </TabsTrigger>
            <TabsTrigger value="homework" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">{t('homework')}</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">{t('goals')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attendance" className="space-y-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData.attendanceData}>
                  <defs>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorCompleted)"
                    animationDuration={1000}
                    name={t('lessonsCompleted')}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(var(--secondary))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fill="none"
                    animationDuration={1000}
                    name={t('totalLessons')}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {analyticsData.attendanceData.slice(-3).map((data, i) => (
                <div key={i} className="bg-muted/30 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">{data.month}</p>
                  <p className="text-2xl font-bold text-primary">{data.rate}%</p>
                  <p className="text-xs text-muted-foreground">{data.completed}/{data.total} {t('lessons')}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="homework" className="space-y-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.homeworkData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="rate"
                    fill="hsl(var(--accent))"
                    radius={[8, 8, 0, 0]}
                    animationDuration={1000}
                    name={t('completionRate')}
                  />
                  <Bar
                    dataKey="avgGrade"
                    fill="hsl(var(--secondary))"
                    radius={[8, 8, 0, 0]}
                    animationDuration={1200}
                    name={t('averageGrade')}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {analyticsData.homeworkData.slice(-3).map((data, i) => (
                <div key={i} className="bg-muted/30 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">{data.month}</p>
                  <p className="text-2xl font-bold text-accent">{data.rate}%</p>
                  <p className="text-xs text-muted-foreground">Grade: {data.avgGrade}/100</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="goals" className="space-y-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analyticsData.goalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="progress"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ r: 6, fill: "hsl(var(--primary))" }}
                    activeDot={{ r: 8 }}
                    animationDuration={1000}
                    name={t('avgProgress')}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="hsl(var(--secondary))"
                    strokeWidth={3}
                    dot={{ r: 6, fill: "hsl(var(--secondary))" }}
                    activeDot={{ r: 8 }}
                    animationDuration={1200}
                    name={t('goalsCompleted')}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {analyticsData.goalData.slice(-3).map((data, i) => (
                <div key={i} className="bg-muted/30 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">{data.month}</p>
                  <p className="text-2xl font-bold text-secondary">{data.progress}%</p>
                  <p className="text-xs text-muted-foreground">{data.completed} {t('completed')}</p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
