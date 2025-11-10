import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Clock, Check, X, User } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StudentRequest {
  id: string;
  student_id: string;
  preferred_level: string;
  preferred_date: string;
  preferred_time: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string;
  } | null;
}

const StudentRequests = () => {
  const [requests, setRequests] = useState<StudentRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadRequests();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('teacher-student-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_availability'
        },
        () => loadRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadRequests = async () => {
    // Fetch requests first
    const { data: requestsData, error: requestsError } = await supabase
      .from("student_availability")
      .select("*")
      .order("preferred_date", { ascending: true })
      .order("preferred_time", { ascending: true });

    if (requestsError) {
      console.error("Error loading requests:", requestsError);
      toast({
        title: "Error",
        description: requestsError.message,
        variant: "destructive",
      });
      return;
    }

    if (!requestsData || requestsData.length === 0) {
      setRequests([]);
      return;
    }

    // Fetch student profiles
    const studentIds = [...new Set(requestsData.map(r => r.student_id))];
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", studentIds);

    if (profilesError) {
      console.error("Error loading profiles:", profilesError);
    }

    // Merge data
    const profilesMap = new Map(
      (profilesData || []).map(p => [p.user_id, p])
    );

    const enrichedRequests = requestsData.map(request => ({
      ...request,
      profiles: profilesMap.get(request.student_id) || null
    }));

    setRequests(enrichedRequests as any);
  };

  const handleAccept = async (request: StudentRequest) => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Create lesson
      const scheduledDateTime = `${request.preferred_date}T${request.preferred_time}:00`;
      
      const { error: lessonError } = await supabase
        .from("lessons")
        .insert({
          teacher_id: user.id,
          student_id: request.student_id,
          scheduled_at: scheduledDateTime,
          lesson_type: "individual",
          status: "scheduled",
          duration_minutes: request.duration_minutes,
          notes: request.notes,
        });

      if (lessonError) throw lessonError;

      // Update request status
      const { error: updateError } = await supabase
        .from("student_availability")
        .update({ status: 'accepted' })
        .eq("id", request.id);

      if (updateError) throw updateError;

      toast({
        title: "Lesson Scheduled!",
        description: `Lesson booked with ${request.profiles?.full_name || 'student'}`,
      });

      loadRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (requestId: string) => {
    const { error } = await supabase
      .from("student_availability")
      .update({ status: 'rejected' })
      .eq("id", requestId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Request Rejected",
        description: "Student has been notified",
      });
      loadRequests();
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

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Student Availability Requests</h2>
        <p className="text-muted-foreground">
          Review and accept student availability requests
        </p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="processed">
            Processed ({processedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingRequests.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <p>No pending requests at the moment</p>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {request.profiles?.full_name || "Unknown"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {request.profiles?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {request.preferred_level}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">
                            {new Date(request.preferred_date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {request.preferred_time}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{request.duration_minutes} min</TableCell>
                      <TableCell className="max-w-xs">
                        {request.notes ? (
                          <p className="text-sm text-muted-foreground italic truncate">
                            "{request.notes}"
                          </p>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleAccept(request)}
                          disabled={loading}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(request.id)}
                          disabled={loading}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="processed" className="space-y-4">
          {processedRequests.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <p>No processed requests yet</p>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {request.profiles?.full_name || "Unknown"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {request.profiles?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {request.preferred_level}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">
                            {new Date(request.preferred_date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {request.preferred_time}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {request.notes ? (
                          <p className="text-sm text-muted-foreground italic truncate">
                            "{request.notes}"
                          </p>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentRequests;