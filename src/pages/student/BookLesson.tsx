import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Clock } from "lucide-react";
import { setHours, setMinutes } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";

interface TimeSlot {
  time: string;
  teacher_id: string;
  availability_id: string;
}

const BookLesson = () => {
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    if (selectedLevel && selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedLevel, selectedDate]);

  const loadAvailableSlots = async () => {
    if (!selectedLevel || !selectedDate) return;

    const dayOfWeek = selectedDate.getDay();
    const { data, error } = await supabase
      .from("teacher_availability")
      .select("id, teacher_id, start_time, end_time")
      .eq("day_of_week", dayOfWeek)
      .eq("level", selectedLevel)
      .eq("is_available", true);

    if (error) {
      toast({
        title: "Error loading slots",
        description: error.message,
        variant: "destructive",
      });
      setAvailableSlots([]);
      return;
    }

    if (data && data.length > 0) {
      const slots: TimeSlot[] = [];
      data.forEach((slot) => {
        const [startHour] = slot.start_time.split(":");
        const [endHour] = slot.end_time.split(":");
        for (let hour = parseInt(startHour); hour < parseInt(endHour); hour++) {
          slots.push({
            time: `${hour.toString().padStart(2, "0")}:00`,
            teacher_id: slot.teacher_id,
            availability_id: slot.id,
          });
        }
      });
      setAvailableSlots(slots);
    } else {
      setAvailableSlots([]);
    }
  };


  const handleBookLesson = async () => {
    if (!selectedSlot || !selectedDate || !selectedLevel) {
      toast({
        title: t('missingInformation'),
        description: t('selectLevelDateAndTime'),
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
        title: t('noActivePackage'),
        description: t('purchasePackageFirst'),
        variant: "destructive",
      });
      return;
    }

    const [hour, minute] = selectedSlot.time.split(":");
    const scheduledAt = setMinutes(setHours(selectedDate, parseInt(hour)), parseInt(minute));

    const { error } = await supabase.from("lessons").insert({
      teacher_id: selectedSlot.teacher_id,
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
        title: t('bookingFailed'),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: t('lessonBooked'),
        description: t('lessonScheduledSuccess'),
      });
      setSelectedSlot(null);
      setAvailableSlots([]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">{t('bookALesson')}</h2>
        <p className="text-muted-foreground">{t('selectYourLevel')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">{t('chooseYourLevel')}</h3>
          <Select value={selectedLevel} onValueChange={setSelectedLevel}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={t('chooseYourLevel')} />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="beginner">{t('beginner')}</SelectItem>
              <SelectItem value="intermediate">{t('intermediate')}</SelectItem>
              <SelectItem value="advanced">{t('advanced')}</SelectItem>
            </SelectContent>
          </Select>
        </Card>

        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">{t('selectDate')}</h3>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={(date) => date < new Date()}
            className="rounded-md border"
          />
        </Card>
      </div>

      {selectedLevel && selectedDate && (
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">{t('availableTimeSlots')}</h3>
          {availableSlots.length === 0 ? (
            <p className="text-muted-foreground">
              {t('noAvailableSlots', { level: t(selectedLevel as any) })}
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {availableSlots.map((slot) => (
                <Button
                  key={`${slot.teacher_id}-${slot.time}`}
                  variant={selectedSlot?.time === slot.time ? "default" : "outline"}
                  onClick={() => setSelectedSlot(slot)}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  {slot.time}
                </Button>
              ))}
            </div>
          )}
        </Card>
      )}

      {selectedSlot && (
        <div className="flex justify-end">
          <Button size="lg" onClick={handleBookLesson}>
            {t('bookLessonButton')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default BookLesson;
