import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { format, addDays, setHours, setMinutes } from "date-fns";

interface Teacher {
  user_id: string;
  full_name: string;
  email: string;
}

interface AvailabilitySlot {
  id: string;
  teacher_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  teacher: Teacher;
}

const BookLesson = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadTeachers();
  }, []);

  useEffect(() => {
    if (selectedTeacher && selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedTeacher, selectedDate]);

  const loadTeachers = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("user_id, profiles!inner(user_id, full_name, email)")
      .eq("role", "teacher");

    if (data) {
      const teacherList = data.map((item: any) => ({
        user_id: item.user_id,
        full_name: item.profiles.full_name,
        email: item.profiles.email,
      }));
      setTeachers(teacherList);
    }
  };

  const loadAvailableSlots = async () => {
    if (!selectedTeacher || !selectedDate) return;

    const dayOfWeek = selectedDate.getDay();
    const { data } = await supabase
      .from("teacher_availability")
      .select("start_time, end_time")
      .eq("teacher_id", selectedTeacher)
      .eq("day_of_week", dayOfWeek)
      .eq("is_available", true);

    if (data && data.length > 0) {
      const slots: string[] = [];
      data.forEach((slot) => {
        const [startHour] = slot.start_time.split(":");
        const [endHour] = slot.end_time.split(":");
        for (let hour = parseInt(startHour); hour < parseInt(endHour); hour++) {
          slots.push(`${hour.toString().padStart(2, "0")}:00`);
        }
      });
      setAvailableSlots(slots);
    } else {
      setAvailableSlots([]);
    }
  };

  const handleBookLesson = async () => {
    if (!selectedTeacher || !selectedDate || !selectedTime) {
      toast({
        title: "Missing information",
        description: "Please select a teacher, date, and time",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if student has active package with remaining lessons
    const currentMonth = new Date(selectedDate).toISOString().split('T')[0].slice(0, 7) + '-01';
    const { data: activePackage } = await supabase
      .from("lesson_packages")
      .select("*")
      .eq("student_id", user.id)
      .eq("status", "active")
      .gt("lessons_remaining", 0)
      .maybeSingle();

    if (!activePackage) {
      toast({
        title: "No active package",
        description: "Please purchase a lesson package first",
        variant: "destructive",
      });
      return;
    }

    const [hour, minute] = selectedTime.split(":");
    const scheduledAt = setMinutes(setHours(selectedDate, parseInt(hour)), parseInt(minute));

    const { error } = await supabase.from("lessons").insert({
      teacher_id: selectedTeacher,
      student_id: user.id,
      package_id: activePackage.id,
      scheduled_at: scheduledAt.toISOString(),
      lesson_type: "individual",
      status: "scheduled",
      duration_minutes: 50,
      price_usd: activePackage.price_per_lesson,
    });

    if (error) {
      toast({
        title: "Booking failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Lesson booked!",
        description: "Your lesson has been scheduled successfully",
      });
      setSelectedTime(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Book a Lesson</h2>
        <p className="text-muted-foreground">Choose a teacher and time slot for your lesson</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Select Teacher</h3>
          <div className="space-y-2">
            {teachers.map((teacher) => (
              <Button
                key={teacher.user_id}
                variant={selectedTeacher === teacher.user_id ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => setSelectedTeacher(teacher.user_id)}
              >
                {teacher.full_name || teacher.email}
              </Button>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Select Date</h3>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={(date) => date < new Date()}
            className="rounded-md border"
          />
        </Card>
      </div>

      {selectedTeacher && selectedDate && (
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Available Time Slots</h3>
          {availableSlots.length === 0 ? (
            <p className="text-muted-foreground">No available slots for this day</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {availableSlots.map((slot) => (
                <Button
                  key={slot}
                  variant={selectedTime === slot ? "default" : "outline"}
                  onClick={() => setSelectedTime(slot)}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  {slot}
                </Button>
              ))}
            </div>
          )}
        </Card>
      )}

      {selectedTime && (
        <div className="flex justify-end">
          <Button size="lg" onClick={handleBookLesson}>
            Book Lesson
          </Button>
        </div>
      )}
    </div>
  );
};

export default BookLesson;
