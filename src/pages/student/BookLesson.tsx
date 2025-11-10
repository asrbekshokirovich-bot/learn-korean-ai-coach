import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Clock, Trash2, Plus, Zap } from "lucide-react";
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
  const navigate = useNavigate();
  const [selectedLevel, setSelectedLevel] = useState<string>("beginner");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>("09:00");
  const [notes, setNotes] = useState<string>("");
  const [myRequests, setMyRequests] = useState<StudentAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [instantLoading, setInstantLoading] = useState(false);
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
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // First, insert the availability request
      const { data: availabilityData, error: insertError } = await supabase
        .from("student_availability")
        .insert({
          student_id: user.id,
          preferred_level: selectedLevel,
          preferred_date: selectedDate.toISOString().split('T')[0],
          preferred_time: selectedTime,
          duration_minutes: 50,
          notes: notes || null,
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Trigger AI auto-assignment
      const { data: assignmentResult, error: assignmentError } = await supabase.functions.invoke(
        'auto-assign-lesson',
        {
          body: { availabilityId: availabilityData.id }
        }
      );

      if (assignmentError) {
        console.error('Assignment error:', assignmentError);
        toast({
          title: "Request Submitted",
          description: "Your request was saved but auto-assignment failed. An admin will help assign a teacher.",
          variant: "default",
        });
      } else if (assignmentResult?.error) {
        toast({
          title: "Request Submitted",
          description: assignmentResult.error,
          variant: "default",
        });
      } else {
        toast({
          title: "✨ Lesson Booked!",
          description: "AI has automatically assigned a teacher and created your lesson!",
        });
      }

      setNotes("");
      loadMyRequests();
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInstantLesson = async () => {
    setInstantLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setInstantLoading(false);
      return;
    }

    try {
      const { data: result, error } = await supabase.functions.invoke(
        'instant-lesson',
        {
          body: { 
            studentId: user.id,
            level: selectedLevel
          }
        }
      );

      if (error) {
        throw error;
      }

      if (result?.error) {
        toast({
          title: "Not Available",
          description: result.error,
          variant: "default",
        });
      } else if (result?.available && result?.videoLesson) {
        toast({
          title: "⚡ Instant Lesson Started!",
          description: "Connecting you to your teacher...",
        });
        // Navigate to the video lesson
        navigate(`/student/video-lesson?id=${result.videoLesson.id}`);
      }
    } catch (error: any) {
      console.error('Instant lesson error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to start instant lesson",
        variant: "destructive",
      });
    } finally {
      setInstantLoading(false);
    }
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
      case 'matched': return 'default';
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
        <h2 className="text-3xl font-bold mb-2">Book a Lesson</h2>
        <p className="text-muted-foreground">
          Start instantly or schedule for later - AI will match you with the perfect teacher
        </p>
      </div>

      {/* Instant Lesson Card */}
      <Card className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-semibold">Start Instant Lesson</h3>
            </div>
            <p className="text-muted-foreground">
              Connect with an available teacher right now for your {selectedLevel} lesson
            </p>
          </div>
          <Button 
            onClick={handleInstantLesson}
            disabled={instantLoading}
            size="lg"
            className="whitespace-nowrap"
          >
            <Zap className="w-4 h-4 mr-2" />
            {instantLoading ? 'Finding Teacher...' : 'Start Now'}
          </Button>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Request Form */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Schedule for Later</h3>
          
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
              {loading ? 'Creating Lesson...' : 'Book Lesson with AI'}
            </Button>
          </div>
        </Card>

        {/* My Requests */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">My Requests</h3>
          
          {myRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No lesson requests yet.</p>
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
