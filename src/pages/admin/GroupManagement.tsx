import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

const groupSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  level: z.string().min(1, "Level is required"),
  description: z.string().optional(),
  max_students: z.string().min(1, "Max students is required"),
  teacher_id: z.string().transform(val => val === "" ? undefined : val).optional(),
  days_of_week: z.array(z.string()).min(1, "At least one day is required"),
  start_time: z.string().min(1, "Start time is required"),
  duration_minutes: z.string().min(1, "Duration is required"),
});

type GroupFormValues = z.infer<typeof groupSchema>;

const DAYS_OF_WEEK = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const GroupManagement = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [permChecked, setPermChecked] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: "",
      level: "",
      description: "",
      max_students: "18",
      teacher_id: "",
      days_of_week: [],
      start_time: "",
      duration_minutes: "90",
    },
  });

  // Establish auth listener first, then read current session
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check admin permission via RPC once auth is ready
  useEffect(() => {
    const checkAdmin = async () => {
      if (!authReady || !session?.user) return;
      try {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: session.user.id,
          _role: 'admin'
        });
        if (error) {
          console.error('has_role RPC error:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(Boolean(data));
        }
      } catch (e) {
        console.error('has_role RPC exception:', e);
        setIsAdmin(false);
      } finally {
        setPermChecked(true);
      }
    };
    checkAdmin();
  }, [authReady, session]);

  // Load data only when auth is initialized
  useEffect(() => {
    if (!authReady) return;
    loadGroups();
    loadTeachers();
    loadStudents();
  }, [authReady]);

  const loadGroups = async () => {
    const { data: groupsData, error: groupsError } = await supabase
      .from("groups")
      .select("*")
      .order("created_at", { ascending: false });

    if (groupsError) {
      toast.error("Failed to load groups");
      return;
    }

    const teacherIds = (groupsData || [])
      .map((g: any) => g.teacher_id)
      .filter((id: string | null | undefined): id is string => !!id);

    let teacherProfilesMap: Record<string, any> = {};
    if (teacherIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", teacherIds);

      if (!profilesError && profilesData) {
        teacherProfilesMap = Object.fromEntries(
          profilesData.map((p: any) => [p.user_id, p])
        );
      }
    }

    // Load enrolled students for each group
    const groupIds = (groupsData || []).map((g: any) => g.id);
    let enrollmentsMap: Record<string, any[]> = {};
    
    if (groupIds.length > 0) {
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from("group_enrollments")
        .select("group_id, student_id, profiles!inner(user_id, full_name, email)")
        .in("group_id", groupIds)
        .eq("status", "active");

      if (!enrollmentsError && enrollmentsData) {
        enrollmentsMap = enrollmentsData.reduce((acc: Record<string, any[]>, enrollment: any) => {
          if (!acc[enrollment.group_id]) acc[enrollment.group_id] = [];
          acc[enrollment.group_id].push(enrollment.profiles);
          return acc;
        }, {});
      }
    }

    const enriched = (groupsData || []).map((g: any) => ({
      ...g,
      teacher_profile: g.teacher_id ? teacherProfilesMap[g.teacher_id] : null,
      enrolled_students: enrollmentsMap[g.id] || [],
    }));

    setGroups(enriched);
  };

  const loadTeachers = async () => {
    // Step 1: get all user ids that have the 'teacher' role
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "teacher");

    if (rolesError) {
      console.error("loadTeachers roles error:", rolesError);
      toast.error("Failed to load teachers");
      return;
    }

    const ids = (roles || []).map((r: any) => r.user_id);
    if (ids.length === 0) {
      setTeachers([]);
      return;
    }

    // Step 2: load their profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", ids);

    if (profilesError) {
      console.error("loadTeachers profiles error:", profilesError);
      toast.error("Failed to load teachers");
      return;
    }

    setTeachers((profiles as any) || []);
  };

  const loadStudents = async () => {
    // Get all user ids that have the 'student' role
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "student");

    if (rolesError) {
      console.error("loadStudents roles error:", rolesError);
      toast.error("Failed to load students");
      return;
    }

    const ids = (roles || []).map((r: any) => r.user_id);
    if (ids.length === 0) {
      setStudents([]);
      return;
    }

    // Load their profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", ids);

    if (profilesError) {
      console.error("loadStudents profiles error:", profilesError);
      toast.error("Failed to load students");
      return;
    }

    setStudents((profiles as any) || []);
  };

  const onSubmit = async (values: GroupFormValues) => {
    try {
      console.log("Form submitted with values:", values);
      
      if (!session?.user) {
        toast.error("Your session expired. Please log in again.");
        return;
      }
      if (!isAdmin) {
        toast.error("You don't have permission to perform this action.");
        return;
      }
      
      const normalizedStartTime = values.start_time?.length === 5 
        ? `${values.start_time}:00`
        : values.start_time;

      const groupData = {
        name: values.name,
        level: values.level,
        description: values.description || null,
        max_students: parseInt(values.max_students),
        teacher_id: (values.teacher_id && values.teacher_id !== "unassigned") ? values.teacher_id : null,
        day_of_week: values.days_of_week.map(d => parseInt(d)),
        start_time: normalizedStartTime,
        duration_minutes: parseInt(values.duration_minutes),
        status: 'active',
      };

      console.log("Prepared group data:", groupData);

      let groupId = editingGroup?.id;

      if (editingGroup) {
        const { error } = await supabase
          .from("groups")
          .update(groupData)
          .eq("id", editingGroup.id);

        if (error) {
          console.error("Update error:", error);
          throw error;
        }
        
        // Update enrollments - remove students not in selectedStudents, add new ones
        const currentEnrollments = editingGroup.enrolled_students?.map((s: any) => s.user_id) || [];
        const toRemove = currentEnrollments.filter((id: string) => !selectedStudents.includes(id));
        const toAdd = selectedStudents.filter((id: string) => !currentEnrollments.includes(id));

        if (toRemove.length > 0) {
          await supabase
            .from("group_enrollments")
            .delete()
            .eq("group_id", groupId)
            .in("student_id", toRemove);
        }

        if (toAdd.length > 0) {
          const { error: enrollError } = await supabase
            .from("group_enrollments")
            .insert(toAdd.map(studentId => ({
              group_id: groupId,
              student_id: studentId,
              status: 'active'
            })));
          
          if (enrollError) {
            console.error("Enrollment insert error:", enrollError);
            toast.error(`Failed to add students: ${enrollError.message}`);
            return;
          }
        }

        await loadGroups();
        toast.success("Group updated successfully");
      } else {
        const { data: newGroup, error } = await supabase
          .from("groups")
          .insert([groupData])
          .select()
          .single();

        if (error) {
          console.error("Insert error:", error);
          throw error;
        }

        groupId = newGroup.id;

        // Add selected students to the new group
        if (selectedStudents.length > 0) {
          const { error: enrollError } = await supabase
            .from("group_enrollments")
            .insert(selectedStudents.map(studentId => ({
              group_id: groupId,
              student_id: studentId,
              status: 'active'
            })));
          
          if (enrollError) {
            console.error("Enrollment insert error:", enrollError);
            toast.error(`Failed to add students: ${enrollError.message}`);
            return;
          }
        }

        await loadGroups();
        toast.success("Group created successfully");
      }

      setDialogOpen(false);
      setEditingGroup(null);
      setSelectedStudents([]);
      form.reset();
    } catch (error: any) {
      console.error("Form submission error:", error);
      const msg = error?.message || "Failed to save group";
      if (typeof msg === "string" && (msg.toLowerCase().includes("row level security") || msg.toLowerCase().includes("rls"))) {
        toast.error("Permission denied by security rules. Ensure you are logged in as an admin and try again.");
      } else {
        toast.error(msg);
      }
    }
  };

  const handleEdit = (group: any) => {
    setEditingGroup(group);
    const enrolledStudentIds = group.enrolled_students?.map((s: any) => s.user_id) || [];
    setSelectedStudents(enrolledStudentIds);
    form.reset({
      name: group.name,
      level: group.level,
      description: group.description || "",
      max_students: group.max_students.toString(),
      teacher_id: group.teacher_id || "unassigned",
      days_of_week: group.day_of_week.map((d: number) => d.toString()),
      start_time: group.start_time,
      duration_minutes: group.duration_minutes.toString(),
    });
    setDialogOpen(true);
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm("Are you sure you want to delete this group?")) return;

    const { error } = await supabase.from("groups").delete().eq("id", groupId);

    if (error) {
      toast.error("Failed to delete group");
      return;
    }

    toast.success("Group deleted successfully");
    loadGroups();
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingGroup(null);
      setSelectedStudents([]);
      form.reset();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Group Management</h2>
          <p className="text-muted-foreground">Create and manage student groups</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button disabled={!permChecked || !session?.user || !isAdmin}>
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingGroup ? "Edit Group" : "Create New Group"}</DialogTitle>
              <DialogDescription>
                {editingGroup ? "Update group details" : "Add a new group to the system"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {!permChecked || !session?.user || !isAdmin ? (
                  <Alert variant="destructive">
                    <AlertTitle>Permission required</AlertTitle>
                    <AlertDescription>
                      You must be logged in as an admin to create or edit groups.
                    </AlertDescription>
                  </Alert>
                ) : null}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Beginner Korean A" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Level</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="elementary">Elementary</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Group description..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="max_students"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Students</FormLabel>
                        <FormControl>
                          <Input type="number" min="2" max="18" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="teacher_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teacher (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select teacher" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="unassigned">No teacher assigned</SelectItem>
                            {teachers.map((teacher) => (
                              <SelectItem key={teacher.user_id} value={teacher.user_id}>
                                {teacher.full_name || teacher.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-3">
                  <FormField
                    control={form.control}
                    name="days_of_week"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Days of Week</FormLabel>
                        <div className="grid grid-cols-4 gap-2">
                          {DAYS_OF_WEEK.map((day) => (
                            <FormItem key={day.value} className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(day.value)}
                                  onCheckedChange={(checked) => {
                                    const updatedDays = checked
                                      ? [...(field.value || []), day.value]
                                      : field.value?.filter((d) => d !== day.value) || [];
                                    field.onChange(updatedDays);
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                {day.label}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="duration_minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (min)</FormLabel>
                        <FormControl>
                          <Input type="number" min="60" max="180" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <FormLabel>Students (Optional)</FormLabel>
                    <ScrollArea className="h-60 border rounded-lg p-4">
                      <div className="space-y-2">
                        {students.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No students available</p>
                        ) : (
                          students.map((student) => (
                            <div key={student.user_id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`student-${student.user_id}`}
                                checked={selectedStudents.includes(student.user_id)}
                                onCheckedChange={(checked) => {
                                  setSelectedStudents(prev =>
                                    checked
                                      ? [...prev, student.user_id]
                                      : prev.filter(id => id !== student.user_id)
                                  );
                                }}
                              />
                              <label
                                htmlFor={`student-${student.user_id}`}
                                className="text-sm font-normal cursor-pointer flex-1"
                              >
                                {student.full_name || student.email}
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                    <p className="text-xs text-muted-foreground mt-2">
                      Selected: {selectedStudents.length} / {form.watch("max_students") || 0}
                    </p>
                  </div>
                </div>

                <Button
                  type="submit" 
                  className="w-full"
                  onClick={() => {
                    console.log("Create Group button clicked");
                    console.log("Form errors:", form.formState.errors);
                    console.log("Form values:", form.getValues());
                  }}
                >
                  {editingGroup ? "Update Group" : "Create Group"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead>Students</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <TableRow key={group.id}>
                <TableCell className="font-medium">{group.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{group.level}</Badge>
                </TableCell>
                <TableCell>
                  {group.day_of_week.map((day: number) => 
                    DAYS_OF_WEEK.find(d => d.value === day.toString())?.label
                  ).join(", ")} {group.start_time} ({group.duration_minutes}min)
                </TableCell>
                <TableCell>{group.teacher_profile?.full_name || "Not assigned"}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {group.enrolled_students?.length || 0} / {group.max_students}
                    </div>
                    {group.enrolled_students?.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {group.enrolled_students.slice(0, 2).map((s: any) => 
                          s.full_name || s.email
                        ).join(", ")}
                        {group.enrolled_students.length > 2 && ` +${group.enrolled_students.length - 2} more`}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={group.status === "active" ? "default" : "secondary"}>
                    {group.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(group)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(group.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {groups.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No groups created yet. Click "Create Group" to add your first group.
          </div>
        )}
      </Card>
    </div>
  );
};

export default GroupManagement;
