import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Clock, Trash2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";

interface StudentAvailability {
  id: string;
  preferred_level: string;
  preferred_date: string;
  preferred_time: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  created_at: string;
}

const BookLesson = () => {
  const [selectedLevel, setSelectedLevel] = useState<string>("beginner");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>("09:00");
  const [notes, setNotes] = useState<string>("");
  const [myRequests, setMyRequests] = useState<StudentAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    loadMyRequests();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('student-availability-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_availability'
        },
        () => loadMyRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadMyRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("student_availability")
      .select("*")
      .eq("student_id", user.id)
      .order("preferred_date", { ascending: true })
      .order("preferred_time", { ascending: true });

    if (error) {
      console.error("Error loading requests:", error);
    } else {
      setMyRequests(data || []);
    }
  };

  const handleSubmitRequest = async () => {
    if (!selectedDate) {
      toast({
        title: "Missing Information",
        description: "Please select a date",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("student_availability")
      .insert({
        student_id: user.id,
        preferred_level: selectedLevel,
        preferred_date: selectedDate.toISOString().split('T')[0],
        preferred_time: selectedTime,
        duration_minutes: 50,
        notes: notes || null,
        status: 'pending'
      });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Request Submitted!",
        description: "Your availability has been sent to teachers",
      });
      setNotes("");
      loadMyRequests();
    }
    setLoading(false);
  };

  const handleDeleteRequest = async (id: string) => {
    const { error } = await supabase
      .from("student_availability")
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
        title: "Deleted",
        description: "Request removed",
      });
      loadMyRequests();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'accepted': return 'default';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const timeSlots = Array.from({ length: 10 }, (_, i) => {
    const hour = 9 + i;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Set Your Availability</h2>
        <p className="text-muted-foreground">
          Choose your preferred times and teachers will book with you
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Request Form */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">New Availability Request</h3>
          
          <div className="space-y-4">
            <div>
              <Label>Your Level</Label>
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Preferred Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
            </div>

            <div>
              <Label>Preferred Time</Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50 max-h-60">
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      <Clock className="w-4 h-4 inline mr-2" />
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Any special requests or topics you'd like to focus on..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-background"
                rows={3}
              />
            </div>

            <Button 
              onClick={handleSubmitRequest} 
              disabled={loading || !selectedDate}
              className="w-full"
              size="lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Submit Availability Request
            </Button>
          </div>
        </Card>

        {/* My Requests */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">My Requests</h3>
          
          {myRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No availability requests yet.</p>
              <p className="text-sm mt-2">Submit your first request to get started!</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {myRequests.map((request) => (
                <Card key={request.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {request.preferred_level}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p className="font-medium">
                          {new Date(request.preferred_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                        <p className="text-muted-foreground">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {request.preferred_time} ({request.duration_minutes} min)
                        </p>
                        {request.notes && (
                          <p className="text-muted-foreground italic text-xs mt-2">
                            "{request.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                    {request.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRequest(request.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default BookLesson;
