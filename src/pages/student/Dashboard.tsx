import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Video, Users, AlertCircle } from "lucide-react";
import { format, getDay, addDays } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const [upcomingLessons, setUpcomingLessons] = useState<any[]>([]);
  const [groupEnrollments, setGroupEnrollments] = useState<any[]>([]);
  const [nextGroupLesson, setNextGroupLesson] = useState<any>(null);
  const [teacherNames, setTeacherNames] = useState<Record<string, string>>({});
  const { t } = useLanguage();

  useEffect(() => {
    loadUpcomingLessons();
    loadGroupEnrollments();
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">{t('dashboard')}</h2>
        <p className="text-muted-foreground">Welcome to your learning dashboard</p>
      </div>

      {/* Next Group Lesson Card */}
      {nextGroupLesson && (
        <Card className="bg-primary/5 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              {isLessonJoinable(nextGroupLesson.groups) ? "Ongoing Lesson" : "Next Group Lesson"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-3">
                <div>
                  <h3 className="text-xl font-semibold">{nextGroupLesson.groups.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{nextGroupLesson.groups.level}</Badge>
                    {isLessonJoinable(nextGroupLesson.groups) && (
                      <Badge className="bg-green-500">Live Now</Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{format(nextGroupLesson.nextDate, "EEEE, MMMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{nextGroupLesson.groups.start_time} ({nextGroupLesson.groups.duration_minutes}min)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>Teacher: {teacherNames[nextGroupLesson.groups.teacher_id] || "Not assigned"}</span>
                  </div>
                </div>
              </div>
              <Button 
                size="lg"
                onClick={() => handleJoinLesson(nextGroupLesson.groups)}
                className={isLessonJoinable(nextGroupLesson.groups) ? "bg-green-600 hover:bg-green-700" : ""}
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
            <h3 className="text-xl font-semibold mb-2">My Group Lessons</h3>
            <p className="text-sm text-muted-foreground">Your enrolled group classes</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {groupEnrollments.map((enrollment) => {
              const group = enrollment.groups;
              const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
              return (
                <Card key={enrollment.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{group.name}</h4>
                        <Badge variant="outline" className="mt-1">{group.level}</Badge>
                      </div>
                      <Badge variant="secondary">{group.current_students_count}/{group.max_students}</Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {Array.isArray(group.day_of_week) 
                            ? group.day_of_week.map((d: number) => DAYS_OF_WEEK[d]).join(', ')
                            : DAYS_OF_WEEK[group.day_of_week]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        <span>{group.start_time}</span>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full"
                      onClick={() => navigate('/student/groups')}
                    >
                      View Details
                    </Button>
                  </div>
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
            <h3 className="text-xl font-semibold mb-2">{t('myLessons')}</h3>
            <p className="text-sm text-muted-foreground">{t('upcomingLessons')}</p>
          </div>
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
                        {t('teacher')}: {lesson.profiles.full_name}
                      </p>
                    )}
                  </div>
                  <Badge>{lesson.status}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {upcomingLessons.length === 0 && groupEnrollments.length === 0 && (
        <Card className="p-12 text-center">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">No Upcoming Lessons</p>
          <p className="text-sm text-muted-foreground">Contact support to get enrolled in group classes</p>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
