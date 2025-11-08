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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface AvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  level: string;
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
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [newSlot, setNewSlot] = useState({
    start_time: "09:00",
    end_time: "17:00",
    level: "",
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

  const toggleDay = (dayIndex: number) => {
    setSelectedDays(prev => 
      prev.includes(dayIndex) 
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex]
    );
  };

  const selectAllDays = () => {
    if (selectedDays.length === DAYS.length) {
      setSelectedDays([]);
    } else {
      setSelectedDays(DAYS.map((_, i) => i));
    }
  };

  const handleAddSlot = async () => {
    if (selectedDays.length === 0) {
      toast({
        title: "No days selected",
        description: "Please select at least one day",
        variant: "destructive",
      });
      return;
    }

    if (!newSlot.level) {
      toast({
        title: "No level selected",
        description: "Please select a teaching level",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Create availability slots for all selected days
    const slotsToInsert = selectedDays.map(day => ({
      teacher_id: user.id,
      day_of_week: day,
      start_time: newSlot.start_time,
      end_time: newSlot.end_time,
      level: newSlot.level,
      is_available: true,
    }));

    const { error } = await supabase
      .from("teacher_availability")
      .insert(slotsToInsert);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Availability added",
        description: `Added availability for ${selectedDays.length} day(s)`,
      });
      setSelectedDays([]);
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
        
        <div className="space-y-6">
          {/* Day selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-medium">Select Days</Label>
              <Button 
                variant="outline" 
                size="sm"
                onClick={selectAllDays}
              >
                {selectedDays.length === DAYS.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {DAYS.map((day, index) => (
                <div 
                  key={index} 
                  className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedDays.includes(index) 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:bg-muted'
                  }`}
                  onClick={() => toggleDay(index)}
                >
                  <Checkbox
                    id={`day-${index}`}
                    checked={selectedDays.includes(index)}
                    onCheckedChange={() => toggleDay(index)}
                  />
                  <Label 
                    htmlFor={`day-${index}`} 
                    className="flex-1 cursor-pointer font-medium"
                  >
                    {day}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Time selection */}
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label className="mb-2 block">Start Time</Label>
              <Select
                value={newSlot.start_time}
                onValueChange={(value) => setNewSlot({ ...newSlot, start_time: value })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Start time" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {HOURS.map((hour) => (
                    <SelectItem key={hour} value={hour}>
                      {hour}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">End Time</Label>
              <Select
                value={newSlot.end_time}
                onValueChange={(value) => setNewSlot({ ...newSlot, end_time: value })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="End time" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {HOURS.map((hour) => (
                    <SelectItem key={hour} value={hour}>
                      {hour}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">Teaching Level</Label>
              <Select
                value={newSlot.level}
                onValueChange={(value) => setNewSlot({ ...newSlot, level: value })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={handleAddSlot} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add to {selectedDays.length || 0} Day(s)
              </Button>
            </div>
          </div>

          {selectedDays.length > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Selected Days:</p>
              <p className="text-sm text-muted-foreground">
                {selectedDays.map(d => DAYS[d]).join(", ")}
              </p>
            </div>
          )}
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
                  <span className="ml-4 text-sm bg-primary/10 text-primary px-2 py-1 rounded">
                    {slot.level}
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
