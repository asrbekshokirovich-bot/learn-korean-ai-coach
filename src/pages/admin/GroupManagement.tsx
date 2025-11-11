import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Users } from "lucide-react";
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
  day_of_week: z.string().min(1, "Day of week is required"),
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: "",
      level: "",
      description: "",
      max_students: "18",
      teacher_id: "",
      day_of_week: "",
      start_time: "",
      duration_minutes: "90",
    },
  });

  useEffect(() => {
    loadGroups();
    loadTeachers();
  }, []);

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

    const enriched = (groupsData || []).map((g: any) => ({
      ...g,
      teacher_profile: g.teacher_id ? teacherProfilesMap[g.teacher_id] : null,
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

  const onSubmit = async (values: GroupFormValues) => {
    try {
      console.log("Form submitted with values:", values);
      
      const groupData = {
        name: values.name,
        level: values.level,
        description: values.description || null,
        max_students: parseInt(values.max_students),
        teacher_id: values.teacher_id || null,
        day_of_week: parseInt(values.day_of_week),
        start_time: values.start_time,
        duration_minutes: parseInt(values.duration_minutes),
      };

      console.log("Prepared group data:", groupData);

      if (editingGroup) {
        const { error } = await supabase
          .from("groups")
          .update(groupData)
          .eq("id", editingGroup.id);

        if (error) {
          console.error("Update error:", error);
          throw error;
        }
        toast.success("Group updated successfully");
      } else {
        const { error } = await supabase.from("groups").insert(groupData);

        if (error) {
          console.error("Insert error:", error);
          throw error;
        }
        toast.success("Group created successfully");
      }

      setDialogOpen(false);
      setEditingGroup(null);
      form.reset();
      loadGroups();
    } catch (error: any) {
      console.error("Form submission error:", error);
      toast.error(error.message || "Failed to save group");
    }
  };

  const handleEdit = (group: any) => {
    setEditingGroup(group);
    form.reset({
      name: group.name,
      level: group.level,
      description: group.description || "",
      max_students: group.max_students.toString(),
      teacher_id: group.teacher_id || "",
      day_of_week: group.day_of_week.toString(),
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
            <Button>
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
                            <SelectItem value="">No teacher assigned</SelectItem>
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

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="day_of_week"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Day</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select day" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DAYS_OF_WEEK.map((day) => (
                              <SelectItem key={day.value} value={day.value}>
                                {day.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                  {DAYS_OF_WEEK.find(d => d.value === group.day_of_week.toString())?.label} {group.start_time} ({group.duration_minutes}min)
                </TableCell>
                <TableCell>{group.teacher_profile?.full_name || "Not assigned"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {group.current_students_count} / {group.max_students}
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
