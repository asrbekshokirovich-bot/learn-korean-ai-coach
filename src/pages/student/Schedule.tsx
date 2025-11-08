import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, User, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, addDays } from "date-fns";

const Schedule = () => {
  const [lessons, setLessons] = useState<any[]>([]);
  const { toast } = useToast();
  const [currentWeek, setCurrentWeek] = useState(new Date());

  useEffect(() => {
    loadWeeklySchedule();
  }, [currentWeek]);

  const loadWeeklySchedule = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const weekStart = startOfWeek(currentWeek);
    const weekEnd = addDays(weekStart, 7);

    const { data } = await supabase
      .from("lessons")
      .select(`
        *,
        enrollments!inner (
          student_id,
          courses (name, format)
        ),
        profiles!lessons_teacher_id_fkey (full_name)
      `)
      .eq("enrollments.student_id", user.id)
      .gte("scheduled_at", weekStart.toISOString())
      .lt("scheduled_at", weekEnd.toISOString())
      .order("scheduled_at", { ascending: true });

    setLessons(data || []);
  };

  const getDaySchedule = (dayOffset: number) => {
    const day = addDays(startOfWeek(currentWeek), dayOffset);
    return lessons.filter(
      (lesson) =>
        format(new Date(lesson.scheduled_at), "yyyy-MM-dd") ===
        format(day, "yyyy-MM-dd")
    );
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(startOfWeek(currentWeek), i);
    return {
      name: format(day, "EEEE"),
      short: format(day, "EEE"),
      date: format(day, "d"),
      full: day,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">My Schedule</h2>
          <p className="text-muted-foreground">View and manage your weekly lessons</p>
        </div>
        <Button disabled>
          <Plus className="w-4 h-4 mr-2" />
          Book Lesson
        </Button>
      </div>

      {/* Week Navigation */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
          >
            Previous Week
          </Button>
          <p className="font-semibold">
            {format(startOfWeek(currentWeek), "MMM d")} -{" "}
            {format(addDays(startOfWeek(currentWeek), 6), "MMM d, yyyy")}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
          >
            Next Week
          </Button>
        </div>
      </Card>

      {/* Weekly Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekDays.map((day, index) => {
          const dayLessons = getDaySchedule(index);
          const isToday =
            format(day.full, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

          return (
            <Card
              key={index}
              className={`p-4 ${isToday ? "border-2 border-primary" : ""}`}
            >
              <div className="mb-3">
                <p className="font-semibold">{day.short}</p>
                <p className={`text-2xl ${isToday ? "text-primary" : ""}`}>
                  {day.date}
                </p>
              </div>

              <div className="space-y-2">
                {dayLessons.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No lessons</p>
                ) : (
                  dayLessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="p-2 bg-primary/10 rounded text-xs space-y-1"
                    >
                      <p className="font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(lesson.scheduled_at), "h:mm a")}
                      </p>
                      <p className="truncate">{lesson.enrollments.courses.name}</p>
                      <Badge variant="secondary" className="text-xs py-0">
                        {lesson.lesson_type}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Upcoming This Week */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">This Week's Lessons</h3>
        {lessons.length === 0 ? (
          <p className="text-muted-foreground">No lessons scheduled this week</p>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson) => (
              <div key={lesson.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold">{lesson.enrollments.courses.name}</h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4" />
                        {format(new Date(lesson.scheduled_at), "EEEE, MMM d")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {format(new Date(lesson.scheduled_at), "h:mm a")}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {lesson.profiles?.full_name || "TBA"}
                      </span>
                    </div>
                  </div>
                  <Badge>{lesson.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Schedule;
