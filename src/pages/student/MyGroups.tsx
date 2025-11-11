import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GroupChat } from "@/components/GroupChat";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Users, Calendar, Clock, MessageCircle, Video, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format, getDay, addDays, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const MyGroups = () => {
  const navigate = useNavigate();
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
    return <div className="text-center py-8">Loading your groups...</div>;
  }

  if (selectedGroup) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setSelectedGroup(null)}>
          ← Back to My Groups
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
          ← Back to My Groups
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
              Next Lesson
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
                    <span>Teacher: {teacherNames[selectedGroupForCalendar.teacher_id] || "Not assigned"}</span>
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
                  Join Lesson
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Lesson Calendar</span>
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
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
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
                Lesson for {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Selected Date"}
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
                        <span>Teacher: {teacherNames[selectedGroupForCalendar.teacher_id] || "Not assigned"}</span>
                      </div>
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={() => handleJoinLesson(selectedGroupForCalendar)}
                    >
                      <Video className="w-4 h-4 mr-2" />
                      Join Lesson
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
        <h2 className="text-3xl font-bold mb-2">My Groups</h2>
        <p className="text-muted-foreground">View and chat with your enrolled groups</p>
      </div>

      {/* Groups Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-2xl font-semibold">Groups</h3>
        </div>

        {enrollments.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Groups Yet</h3>
            <p className="text-muted-foreground">
              You haven't been enrolled in any groups yet. Contact support to join a group!
            </p>
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
                          {group.current_students_count} / {group.max_students} students
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
                        <p className="text-muted-foreground text-xs">Teacher</p>
                        <p className="font-medium">
                          {teacherNames[group.teacher_id] || "Not assigned"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs text-muted-foreground">
                        Enrolled on {format(new Date(enrollment.enrolled_at), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => setSelectedGroupForCalendar(group)}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      View Calendar
                    </Button>
                    <Button onClick={() => setSelectedGroup(group)}>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Open Chat
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
