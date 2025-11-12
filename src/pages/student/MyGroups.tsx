import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GroupChat } from "@/components/GroupChat";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Users, Calendar, Clock, MessageCircle, Video, AlertCircle, Award } from "lucide-react";
import { toast } from "sonner";
import { format, getDay, addDays, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const MyGroups = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [selectedGroupForCalendar, setSelectedGroupForCalendar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [teacherNames, setTeacherNames] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  useEffect(() => {
    loadEnrollments();
  }, []);

  const loadEnrollments = async () => {
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
      setEnrollments(enrolls);

      const teacherIds = Array.from(new Set(enrolls.map((e: any) => e.groups?.teacher_id).filter((id: string) => !!id)));
      if (teacherIds.length > 0) {
        const { data: profiles, error: pErr } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", teacherIds);
        if (!pErr && profiles) {
          const map = Object.fromEntries(profiles.map((p: any) => [p.user_id, p.full_name]));
          setTeacherNames(map);
        }
      }
    } catch (error: any) {
      toast.error("Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const getLessonsForDate = (date: Date, groupId?: string) => {
    const dayOfWeek = getDay(date);
    return enrollments.filter((enrollment) => {
      const group = enrollment.groups;
      const matchesGroup = groupId ? group.id === groupId : true;
      const matchesDay = Array.isArray(group.day_of_week)
        ? group.day_of_week.includes(dayOfWeek)
        : group.day_of_week === dayOfWeek;
      return matchesGroup && matchesDay;
    });
  };

  const handleJoinLesson = (group: any) => {
    const now = new Date();
    const [hours, minutes] = group.start_time.split(":").map(Number);
    const lessonStart = new Date(selectedDate!);
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

    // Navigate to video lesson page
    toast.success("Joining lesson...");
    navigate(`/student/video-lesson?groupId=${group.id}&groupName=${encodeURIComponent(group.name)}`);
  };

  const getLessonsForDay = (day: Date, groupId?: string) => {
    const dayOfWeek = getDay(day);
    return enrollments.filter((enrollment) => {
      const group = enrollment.groups;
      const matchesGroup = groupId ? group.id === groupId : true;
      const matchesDay = Array.isArray(group.day_of_week)
        ? group.day_of_week.includes(dayOfWeek)
        : group.day_of_week === dayOfWeek;
      return matchesGroup && matchesDay;
    });
  };

  const getNextLesson = (group: any) => {
    const now = new Date();
    const today = getDay(now);
    const groupDays = Array.isArray(group.day_of_week) ? group.day_of_week : [group.day_of_week];
    
    // Find the next occurrence
    let daysUntilNext = 7;
    let nextDay = -1;
    
    for (const day of groupDays) {
      const diff = (day - today + 7) % 7;
      if (diff < daysUntilNext || (diff === 0 && daysUntilNext === 7)) {
        // Check if today and time hasn't passed
        if (diff === 0) {
          const [hours, minutes] = group.start_time.split(":").map(Number);
          const lessonStart = new Date();
          lessonStart.setHours(hours, minutes, 0, 0);
          if (now > lessonStart) continue; // Skip if already passed
        }
        daysUntilNext = diff === 0 ? 0 : diff;
        nextDay = day;
      }
    }
    
    if (nextDay === -1) {
      // All lessons this week passed, get the first day next week
      nextDay = Math.min(...groupDays);
      daysUntilNext = (nextDay - today + 7) % 7 || 7;
    }
    
    const nextDate = addDays(now, daysUntilNext);
    return nextDate;
  };

  const selectedDateLessons = selectedDate && selectedGroupForCalendar 
    ? getLessonsForDate(selectedDate, selectedGroupForCalendar.id) 
    : [];

  if (loading) {
    return <div className="text-center py-8">{t('loadingYourGroups')}</div>;
  }

  if (selectedGroup) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setSelectedGroup(null)}>
          {t('backToMyGroups')}
        </Button>
        <GroupChat
          groupId={selectedGroup.id}
          teacherId={selectedGroup.teacher_id}
          groupName={selectedGroup.name}
        />
      </div>
    );
  }

  if (selectedGroupForCalendar) {
    const nextLessonDate = getNextLesson(selectedGroupForCalendar);
    const nextLessonEnrollment = enrollments.find(e => e.groups.id === selectedGroupForCalendar.id);
    
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => setSelectedGroupForCalendar(null)}>
          {t('backToMyGroups')}
        </Button>

        <div>
          <h2 className="text-3xl font-bold mb-2">{selectedGroupForCalendar.name}</h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{selectedGroupForCalendar.level}</Badge>
            <Badge variant={selectedGroupForCalendar.status === "active" ? "default" : "secondary"}>
              {selectedGroupForCalendar.status}
            </Badge>
          </div>
        </div>

        {/* Next Lesson Card */}
        <Card className="bg-primary/5 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              {t('nextLesson')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-lg font-semibold">
                      {format(nextLessonDate, "EEEE, MMMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedGroupForCalendar.start_time} ({selectedGroupForCalendar.duration_minutes}min)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>{t('teacher')}: {teacherNames[selectedGroupForCalendar.teacher_id] || t('notAssigned')}</span>
                  </div>
                </div>
                <Button 
                  size="lg"
                  onClick={() => {
                    setSelectedDate(nextLessonDate);
                    handleJoinLesson(selectedGroupForCalendar);
                  }}
                >
                  <Video className="w-5 h-5 mr-2" />
                  {t('joinLesson')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t('lessonCalendar')}</span>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                >
                  ←
                </Button>
                <span className="text-lg font-normal">{format(currentMonth, "MMMM yyyy")}</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                >
                  →
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {[t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')].map((day) => (
                <div key={day} className="text-center font-semibold text-sm p-2 text-muted-foreground">
                  {day}
                </div>
              ))}
              {eachDayOfInterval({
                start: startOfMonth(currentMonth),
                end: endOfMonth(currentMonth)
              }).map((day, idx) => {
                const dayLessons = getLessonsForDay(day, selectedGroupForCalendar.id);
                const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                const isSelected = selectedDate && format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(day)}
                    className={`min-h-24 p-2 border rounded-lg hover:bg-accent transition-colors ${
                      isToday ? "border-primary" : ""
                    } ${isSelected ? "bg-accent" : ""} ${dayLessons.length > 0 ? "bg-primary/5" : ""}`}
                  >
                    <div className="text-right text-sm font-semibold mb-1">
                      {format(day, "d")}
                    </div>
                    <div className="space-y-1">
                      {dayLessons.map((enrollment, i) => (
                        <div 
                          key={i}
                          className="text-xs bg-primary/20 text-primary px-1 py-0.5 rounded"
                        >
                          {selectedGroupForCalendar.start_time}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Day Lesson */}
        {selectedDateLessons.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                {t('lessonFor')} {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Selected Date"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{selectedGroupForCalendar.name}</h3>
                        <Badge variant="outline" className="mt-1">{selectedGroupForCalendar.level}</Badge>
                      </div>
                      <Badge>{selectedGroupForCalendar.duration_minutes}min</Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedGroupForCalendar.start_time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>{t('teacher')}: {teacherNames[selectedGroupForCalendar.teacher_id] || t('notAssigned')}</span>
                      </div>
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={() => handleJoinLesson(selectedGroupForCalendar)}
                    >
                      <Video className="w-4 h-4 mr-2" />
                      {t('joinLesson')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold mb-2">{t('myGroups')}</h2>
        <p className="text-muted-foreground">{t('viewAndChatWithGroups')}</p>
      </div>

      {/* Groups Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-2xl font-semibold">{t('groups')}</h3>
        </div>

        {enrollments.length === 0 ? (
          <Card className="border-2 border-primary shadow-glow bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl"></div>
            <CardContent className="p-12 text-center relative z-10">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent shadow-glow mb-6">
                <Users className="w-10 h-10 text-white animate-pulse" />
              </div>
              <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {t('noGroupsYet') || 'No Groups Yet'}
              </h3>
              <p className="text-muted-foreground mb-8 text-lg max-w-md mx-auto">
                {t('noGroupsDescription') || 'You are not enrolled in any groups yet. Subscribe to join group lessons and start learning Korean with expert teachers!'}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="text-lg px-8 py-6 shadow-elegant hover:shadow-glow transition-all duration-300 hover:scale-105"
                  onClick={() => navigate("/student/monthly-subscription")}
                >
                  <Award className="w-5 h-5 mr-2" />
                  Subscribe Now
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-8 py-6 border-2 hover:bg-accent/10 transition-all duration-300 hover:scale-105"
                  onClick={() => navigate("/student/admin-chat")}
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Contact Admin
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {enrollments.map((enrollment) => {
            const group = enrollment.groups;
            return (
              <Card key={enrollment.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{group.name}</h3>
                      <Badge variant="outline">{group.level}</Badge>
                      <Badge variant={group.status === "active" ? "default" : "secondary"}>
                        {group.status}
                      </Badge>
                    </div>

                    {group.description && (
                      <p className="text-muted-foreground mb-4">{group.description}</p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {group.current_students_count} / {group.max_students} {t('students')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{Array.isArray(group.day_of_week) ? group.day_of_week.map((d: number) => DAYS_OF_WEEK[d]).join(', ') : DAYS_OF_WEEK[group.day_of_week]}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {group.start_time} ({group.duration_minutes}min)
                        </span>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">{t('teacher')}</p>
                        <p className="font-medium">
                          {teacherNames[group.teacher_id] || t('notAssigned')}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs text-muted-foreground">
                        {t('enrolledOn')} {format(new Date(enrollment.enrolled_at), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => setSelectedGroupForCalendar(group)}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      {t('viewCalendar')}
                    </Button>
                    <Button onClick={() => setSelectedGroup(group)}>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      {t('openChat')}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyGroups;
