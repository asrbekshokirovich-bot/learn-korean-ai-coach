import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Calendar, Users, CheckCircle2, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface DemoLesson {
  id: string;
  student_id: string;
  scheduled_at: string;
  status: string;
  detected_level: string | null;
  coordinator_notes: string | null;
  ai_recommendations: any[];
  recommended_group_id: string | null;
  student: {
    full_name: string;
    email: string;
    topik_level: string | null;
  };
}

interface GroupRecommendation {
  group_id: string;
  confidence: number;
  reasoning: string;
  priority: number;
}

const DemoLessons = () => {
  const [demoLessons, setDemoLessons] = useState<DemoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<DemoLesson | null>(null);
  const [detectedLevel, setDetectedLevel] = useState("");
  const [notes, setNotes] = useState("");
  const [recommendations, setRecommendations] = useState<GroupRecommendation[]>([]);
  const [recommendedGroups, setRecommendedGroups] = useState<any[]>([]);

  useEffect(() => {
    loadDemoLessons();
    
    const channel = supabase
      .channel('demo_lessons_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'demo_lessons' 
      }, () => {
        loadDemoLessons();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadDemoLessons = async () => {
    try {
      const { data, error } = await supabase
        .from('demo_lessons')
        .select(`
          *,
          student:profiles!demo_lessons_student_id_fkey(full_name, email, topik_level)
        `)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setDemoLessons(data || []);
    } catch (error: any) {
      toast.error("Failed to load demo lessons");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetRecommendations = async () => {
    if (!selectedLesson || !detectedLevel) {
      toast.error("Please select a level first");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('recommend-group', {
        body: {
          studentId: selectedLesson.student_id,
          demoLessonId: selectedLesson.id,
          coordinatorNotes: notes,
          detectedLevel
        }
      });

      if (error) throw error;

      setRecommendations(data.recommendations || []);
      setRecommendedGroups(data.groups || []);
      toast.success("AI recommendations generated!");
    } catch (error: any) {
      toast.error("Failed to get recommendations");
      console.error(error);
    }
  };

  const handleCompleteDemo = async (groupId: string) => {
    if (!selectedLesson) return;

    try {
      // Update demo lesson
      const { error: demoError } = await supabase
        .from('demo_lessons')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          detected_level: detectedLevel,
          coordinator_notes: notes,
          recommended_group_id: groupId
        })
        .eq('id', selectedLesson.id);

      if (demoError) throw demoError;

      // Enroll student in the group
      const { error: enrollError } = await supabase
        .from('group_enrollments')
        .insert({
          group_id: groupId,
          student_id: selectedLesson.student_id,
          status: 'active'
        });

      if (enrollError) throw enrollError;

      // Update student's TOPIK level
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ topik_level: detectedLevel })
        .eq('user_id', selectedLesson.student_id);

      if (profileError) throw profileError;

      toast.success("Student enrolled in group successfully!");
      setSelectedLesson(null);
      setRecommendations([]);
      setRecommendedGroups([]);
      loadDemoLessons();
    } catch (error: any) {
      toast.error("Failed to complete enrollment");
      console.error(error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      scheduled: "default",
      completed: "success",
      cancelled: "destructive"
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Demo Lessons</h1>
        <Badge variant="secondary" className="text-lg">
          <Clock className="w-4 h-4 mr-2" />
          {demoLessons.filter(d => d.status === 'scheduled').length} Pending
        </Badge>
      </div>

      <div className="grid gap-4">
        {demoLessons.map((lesson) => (
          <Card key={lesson.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {lesson.student.full_name}
                </CardTitle>
                {getStatusBadge(lesson.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{lesson.student.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Scheduled</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(lesson.scheduled_at).toLocaleString()}
                  </p>
                </div>
                {lesson.detected_level && (
                  <div>
                    <p className="text-muted-foreground">Detected Level</p>
                    <p className="font-medium">{lesson.detected_level}</p>
                  </div>
                )}
              </div>

              {lesson.status === 'scheduled' && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full"
                      onClick={() => {
                        setSelectedLesson(lesson);
                        setNotes(lesson.coordinator_notes || "");
                        setDetectedLevel(lesson.detected_level || "");
                      }}
                    >
                      Conduct Assessment
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Demo Lesson Assessment - {lesson.student.full_name}</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div>
                        <Label>Detected Level</Label>
                        <Select value={detectedLevel} onValueChange={setDetectedLevel}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="elementary">Elementary</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Coordinator Notes</Label>
                        <Textarea
                          placeholder="Enter observations about the student..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={4}
                        />
                      </div>

                      <Button 
                        onClick={handleGetRecommendations}
                        className="w-full"
                        disabled={!detectedLevel}
                      >
                        Get AI Group Recommendations
                      </Button>

                      {recommendations.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="font-semibold">Recommended Groups:</h3>
                          {recommendations.map((rec, idx) => {
                            const group = recommendedGroups.find(g => g.id === rec.group_id);
                            if (!group) return null;
                            
                            return (
                              <Card key={rec.group_id} className="border-2">
                                <CardContent className="pt-4 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium">{group.name}</h4>
                                    <Badge variant={rec.priority === 1 ? "default" : "secondary"}>
                                      Priority {rec.priority}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground space-y-1">
                                    <p>Teacher: {group.teacher}</p>
                                    <p>Students: {group.current_students}/{group.max_students}</p>
                                    <p>Duration: {group.duration_minutes} minutes</p>
                                    <p>Confidence: {rec.confidence}%</p>
                                    <p className="italic">{rec.reasoning}</p>
                                  </div>
                                  <Button
                                    onClick={() => handleCompleteDemo(rec.group_id)}
                                    className="w-full mt-2"
                                    variant={rec.priority === 1 ? "default" : "outline"}
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Enroll in This Group
                                  </Button>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {demoLessons.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center h-32 text-muted-foreground">
            No demo lessons scheduled
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DemoLessons;