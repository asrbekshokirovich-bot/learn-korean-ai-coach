import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Info } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
      .eq("status", "pending")
      .order("preferred_date", { ascending: true })
      .order("preferred_time", { ascending: true });

    if (requestsError) {
      console.error("Error loading requests:", requestsError);
      return;
    }

    if (!requestsData || requestsData.length === 0) {
      setRequests([]);
      return;
    }

    // Fetch student profiles
    const studentIds = [...new Set(requestsData.map(r => r.student_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", studentIds);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'accepted': return 'default';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Student Availability Requests</h2>
        <p className="text-muted-foreground">
          View student availability - Admin handles all bookings
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          You can view student requests here. The admin will assign students to you based on availability and matching.
        </AlertDescription>
      </Alert>

      {requests.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <p>No pending student requests at the moment</p>
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
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
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
                  <TableCell>
                    <Badge variant={getStatusColor(request.status)}>
                      {request.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default StudentRequests;