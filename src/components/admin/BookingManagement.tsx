import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Clock, Check, X, UserCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StudentRequest {
  id: string;
  student_id: string;
  preferred_level: string;
  preferred_date: string;
  preferred_time: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  student_profile: {
    full_name: string | null;
    email: string;
  } | null;
}

interface Teacher {
  user_id: string;
  full_name: string | null;
  email: string;
  teacher_levels: string[];
}

const BookingManagement = () => {
  const [requests, setRequests] = useState<StudentRequest[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<StudentRequest | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('admin-booking-management')
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

  const loadData = async () => {
    await Promise.all([loadRequests(), loadTeachers()]);
  };

  const loadRequests = async () => {
    const { data: requestsData } = await supabase
      .from("student_availability")
      .select("*")
      .eq("status", "pending")
      .order("preferred_date", { ascending: true })
      .order("preferred_time", { ascending: true });

    if (!requestsData) {
      setRequests([]);
      return;
    }

    const studentIds = [...new Set(requestsData.map(r => r.student_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", studentIds);

    const profilesMap = new Map(
      (profilesData || []).map(p => [p.user_id, p])
    );

    const enrichedRequests = requestsData.map(request => ({
      ...request,
      student_profile: profilesMap.get(request.student_id) || null
    }));

    setRequests(enrichedRequests as any);
  };

  const loadTeachers = async () => {
    const { data: teacherRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "teacher");

    if (!teacherRoles || teacherRoles.length === 0) {
      setTeachers([]);
      return;
    }

    const teacherIds = teacherRoles.map(r => r.user_id);
    const { data: teacherProfiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, teacher_levels")
      .in("user_id", teacherIds);

    setTeachers(teacherProfiles || []);
  };

  const handleOpenAssignDialog = (request: StudentRequest) => {
    setSelectedRequest(request);
    setSelectedTeacher("");
    setDialogOpen(true);
  };

  const handleAssignTeacher = async () => {
    if (!selectedRequest || !selectedTeacher) return;

    setLoading(true);
    try {
      const scheduledDateTime = `${selectedRequest.preferred_date}T${selectedRequest.preferred_time}:00`;

      const { error: lessonError } = await supabase
        .from("lessons")
        .insert({
          teacher_id: selectedTeacher,
          student_id: selectedRequest.student_id,
          scheduled_at: scheduledDateTime,
          lesson_type: "individual",
          status: "scheduled",
          duration_minutes: selectedRequest.duration_minutes,
          notes: selectedRequest.notes,
        });

      if (lessonError) throw lessonError;

      const { error: updateError } = await supabase
        .from("student_availability")
        .update({ status: 'accepted' })
        .eq("id", selectedRequest.id);

      if (updateError) throw updateError;

      toast({
        title: "Lesson Scheduled!",
        description: `Lesson assigned to teacher`,
      });

      setDialogOpen(false);
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

  const getMatchingTeachers = (level: string) => {
    return teachers.filter(t => 
      t.teacher_levels && t.teacher_levels.includes(level)
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Booking Management</h2>
        <p className="text-muted-foreground">
          Match students with teachers and create lessons
        </p>
      </div>

      {requests.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <p>No pending booking requests</p>
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
                <TableHead>Matching Teachers</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => {
                const matchingTeachers = getMatchingTeachers(request.preferred_level);
                return (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {request.student_profile?.full_name || "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {request.student_profile?.email}
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
                      <Badge variant="secondary">
                        {matchingTeachers.length} available
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleOpenAssignDialog(request)}
                        disabled={matchingTeachers.length === 0}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Assign
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(request.id)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Assign Teacher Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Teacher to Lesson</DialogTitle>
            <DialogDescription>
              Select a teacher for {selectedRequest?.student_profile?.full_name}'s lesson
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm">
                  <strong>Date:</strong> {new Date(selectedRequest.preferred_date).toLocaleDateString()}
                </p>
                <p className="text-sm">
                  <strong>Time:</strong> {selectedRequest.preferred_time}
                </p>
                <p className="text-sm">
                  <strong>Level:</strong> <Badge variant="outline" className="capitalize">{selectedRequest.preferred_level}</Badge>
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Select Teacher</label>
                <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a teacher..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getMatchingTeachers(selectedRequest.preferred_level).map((teacher) => (
                      <SelectItem key={teacher.user_id} value={teacher.user_id}>
                        <div className="flex items-center gap-2">
                          <UserCircle className="w-4 h-4" />
                          <span>{teacher.full_name || teacher.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignTeacher}
                  disabled={!selectedTeacher || loading}
                  className="flex-1"
                >
                  Confirm Assignment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingManagement;