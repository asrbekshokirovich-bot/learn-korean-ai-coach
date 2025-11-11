import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, Users, Video, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format, isSameDay, addDays, startOfWeek, getDay } from "date-fns";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface GroupLesson {
  id: string;
  name: string;
  level: string;
  day_of_week: number[];
  start_time: string;
  duration_minutes: number;
  teacher?: {
    full_name: string;
  };
}

const GroupSchedule = () => {
  const [groups, setGroups] = useState<GroupLesson[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedLesson, setSelectedLesson] = useState<GroupLesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("group_enrollments")
        .select(`
          groups:groups!group_enrollments_group_id_fkey(
            id,
            name,
            level,
            day_of_week,
            start_time,
            duration_minutes,
            teacher:profiles!groups_teacher_id_fkey(full_name)
          )
        `)
        .eq("student_id", user.id)
        .eq("status", "active");

      if (error) throw error;

      const groupsData = (data || [])
        .map((e: any) => e.groups)
        .filter((g: any) => g !== null);
      
      setGroups(groupsData);
    } catch (error: any) {
      toast.error("Failed to load schedule");
    } finally {
      setLoading(false);
    }
  };

  const getLessonsForDate = (date: Date) => {
    const dayOfWeek = getDay(date);
    return groups.filter(group => 
      Array.isArray(group.day_of_week) 
        ? group.day_of_week.includes(dayOfWeek)
        : group.day_of_week === dayOfWeek
    );
  };

  const handleJoinLesson = (lesson: GroupLesson) => {
    const now = new Date();
    const [hours, minutes] = lesson.start_time.split(':').map(Number);
    const lessonStart = new Date(selectedDate!);
    lessonStart.setHours(hours, minutes, 0, 0);
    const lessonEnd = new Date(lessonStart.getTime() + lesson.duration_minutes * 60000);

    if (now < lessonStart) {
      const minutesUntil = Math.floor((lessonStart.getTime() - now.getTime()) / 60000);
      toast.error(`Lesson hasn't started yet. It will begin in ${minutesUntil} minutes.`);
      return;
    }

    if (now > lessonEnd) {
      toast.error("This lesson has already ended.");
      return;
    }

    // Join the lesson (implement your video call logic here)
    toast.success("Joining lesson...");
    // window.open(meetingLink, '_blank');
  };

  const daysWithLessons = groups.flatMap(group => {
    const weekStart = startOfWeek(new Date());
    return (Array.isArray(group.day_of_week) ? group.day_of_week : [group.day_of_week]).map(day => 
      addDays(weekStart, day)
    );
  });

  const selectedDateLessons = selectedDate ? getLessonsForDate(selectedDate) : [];

  if (loading) {
    return <div className="text-center py-8">Loading schedule...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Group Lesson Schedule</h2>
        <p className="text-muted-foreground">View your upcoming group lessons and join when it's time</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
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
                {selectedDateLessons.map((lesson) => (
                  <Card key={lesson.id} className="border-2">
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{lesson.name}</h3>
                            <Badge variant="outline" className="mt-1">{lesson.level}</Badge>
                          </div>
                          <Badge>{lesson.duration_minutes}min</Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>{lesson.start_time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span>Teacher: {lesson.teacher?.full_name || "Not assigned"}</span>
                          </div>
                        </div>

                        <Button 
                          className="w-full" 
                          onClick={() => handleJoinLesson(lesson)}
                        >
                          <Video className="w-4 h-4 mr-2" />
                          Join Lesson
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>This Week's Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {groups.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No groups enrolled yet
              </p>
            ) : (
              groups.map((group) => (
                <div key={group.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold">{group.name}</h4>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>
                        {Array.isArray(group.day_of_week) 
                          ? group.day_of_week.map(d => DAYS_OF_WEEK[d]).join(', ')
                          : DAYS_OF_WEEK[group.day_of_week]}
                      </span>
                      <span>{group.start_time}</span>
                      <span>{group.duration_minutes} minutes</span>
                    </div>
                  </div>
                  <Badge variant="outline">{group.level}</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GroupSchedule;
