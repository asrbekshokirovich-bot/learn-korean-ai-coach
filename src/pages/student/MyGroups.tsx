import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GroupChat } from "@/components/GroupChat";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Users, Calendar, Clock, MessageCircle, Video, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format, getDay, addDays, startOfWeek } from "date-fns";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const MyGroups = () => {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [teacherNames, setTeacherNames] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

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

  const getLessonsForDate = (date: Date) => {
    const dayOfWeek = getDay(date);
    return enrollments.filter((enrollment) => {
      const group = enrollment.groups;
      return Array.isArray(group.day_of_week)
        ? group.day_of_week.includes(dayOfWeek)
        : group.day_of_week === dayOfWeek;
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

    toast.success("Joining lesson...");
  };

  const daysWithLessons = enrollments.flatMap((enrollment) => {
    const group = enrollment.groups;
    const weekStart = startOfWeek(new Date());
    return (Array.isArray(group.day_of_week) ? group.day_of_week : [group.day_of_week]).map(
      (day: number) => addDays(weekStart, day)
    );
  });

  const selectedDateLessons = selectedDate ? getLessonsForDate(selectedDate) : [];

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">My Groups</h2>
        <p className="text-muted-foreground">View and chat with your enrolled groups</p>
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

                  <Button onClick={() => setSelectedGroup(group)}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Open Chat
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Calendar Section */}
      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Group Lesson Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border pointer-events-auto"
              modifiers={{
                hasLesson: daysWithLessons
              }}
              modifiersClassNames={{
                hasLesson: "bg-primary/20 font-bold"
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Select a date"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateLessons.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                <p>No lessons scheduled for this day</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDateLessons.map((enrollment) => {
                  const group = enrollment.groups;
                  return (
                    <Card key={enrollment.id} className="border-2">
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{group.name}</h3>
                              <Badge variant="outline" className="mt-1">{group.level}</Badge>
                            </div>
                            <Badge>{group.duration_minutes}min</Badge>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span>{group.start_time}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              <span>Teacher: {teacherNames[group.teacher_id] || "Not assigned"}</span>
                            </div>
                          </div>

                          <Button 
                            className="w-full" 
                            onClick={() => handleJoinLesson(group)}
                          >
                            <Video className="w-4 h-4 mr-2" />
                            Join Lesson
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyGroups;
