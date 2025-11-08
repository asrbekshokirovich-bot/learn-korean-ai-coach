import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const HOURS = Array.from({ length: 24 }, (_, i) => 
  `${i.toString().padStart(2, "0")}:00`
);

const Availability = () => {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [newSlot, setNewSlot] = useState({
    day_of_week: 1,
    start_time: "09:00",
    end_time: "17:00",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("teacher_availability")
      .select("*")
      .eq("teacher_id", user.id)
      .order("day_of_week", { ascending: true });

    if (data) {
      setSlots(data);
    }
  };

  const handleAddSlot = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("teacher_availability").insert({
      teacher_id: user.id,
      day_of_week: newSlot.day_of_week,
      start_time: newSlot.start_time,
      end_time: newSlot.end_time,
      is_available: true,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Availability added",
        description: "Your availability slot has been added",
      });
      loadAvailability();
    }
  };

  const handleDeleteSlot = async (id: string) => {
    const { error } = await supabase
      .from("teacher_availability")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Availability removed",
        description: "Your availability slot has been removed",
      });
      loadAvailability();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">My Availability</h2>
        <p className="text-muted-foreground">Manage when students can book lessons with you</p>
      </div>

      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Add Availability Slot</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <Select
            value={newSlot.day_of_week.toString()}
            onValueChange={(value) =>
              setNewSlot({ ...newSlot, day_of_week: parseInt(value) })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((day, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={newSlot.start_time}
            onValueChange={(value) => setNewSlot({ ...newSlot, start_time: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Start time" />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map((hour) => (
                <SelectItem key={hour} value={hour}>
                  {hour}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={newSlot.end_time}
            onValueChange={(value) => setNewSlot({ ...newSlot, end_time: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="End time" />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map((hour) => (
                <SelectItem key={hour} value={hour}>
                  {hour}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleAddSlot}>
            <Plus className="w-4 h-4 mr-2" />
            Add Slot
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Current Availability</h3>
        <div className="space-y-2">
          {slots.length === 0 ? (
            <p className="text-muted-foreground">No availability slots set</p>
          ) : (
            slots.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <span className="font-medium">{DAYS[slot.day_of_week]}</span>
                  <span className="text-muted-foreground ml-4">
                    {slot.start_time} - {slot.end_time}
                  </span>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteSlot(slot.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default Availability;
