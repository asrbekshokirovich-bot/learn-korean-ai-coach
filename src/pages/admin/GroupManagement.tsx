import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Helper to bypass strict typing when backend tables are not yet available
const from = (table: string) => (supabase as any).from(table);

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Plus, Edit, Trash2 } from "lucide-react";

interface LessonGroup {
  id: string;
  name: string;
  level: string;
  teacher_id: string;
  max_students: number;
  current_students: number;
  duration_minutes: number;
  schedule_day: number;
  schedule_time: string;
  is_active: boolean;
  teacher: {
    full_name: string;
  };
}

interface Teacher {
  user_id: string;
  full_name: string;
  teacher_levels: string[];
}

const GroupManagement = () => {
  const [groups, setGroups] = useState<LessonGroup[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    level: "beginner",
    teacher_id: "",
    max_students: 18,
    schedule_day: 0,
    schedule_time: "09:00"
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [groupsRes, teachersRes] = await Promise.all([
        from('lesson_groups')
          .select(`
            *,
            teacher:profiles!lesson_groups_teacher_id_fkey(full_name)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('user_id, full_name, teacher_levels')
          .not('teacher_levels', 'is', null)
      ]);

      if (groupsRes.error) throw groupsRes.error;
      if (teachersRes.error) throw teachersRes.error;

      setGroups(groupsRes.data || []);
      setTeachers(teachersRes.data || []);
    } catch (error: any) {
      toast.error("Failed to load data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    try {
      const { error } = await from('lesson_groups')
        .insert({
          ...formData,
          duration_minutes: 90 // Will be auto-adjusted by trigger
        });

      if (error) throw error;

      toast.success("Group created successfully!");
      setDialogOpen(false);
      setFormData({
        name: "",
        level: "beginner",
        teacher_id: "",
        max_students: 18,
        schedule_day: 0,
        schedule_time: "09:00"
      });
      loadData();
    } catch (error: any) {
      toast.error("Failed to create group");
      console.error(error);
    }
  };

  const handleToggleActive = async (groupId: string, currentStatus: boolean) => {
    try {
      const { error } = await from('lesson_groups')
        .update({ is_active: !currentStatus })
        .eq('id', groupId);

      if (error) throw error;

      toast.success(currentStatus ? "Group deactivated" : "Group activated");
      loadData();
    } catch (error: any) {
      toast.error("Failed to update group");
      console.error(error);
    }
  };

  const getDayName = (day: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  };

  const getCapacityBadge = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return <Badge variant="destructive">{current}/{max}</Badge>;
    if (percentage >= 70) return <Badge variant="secondary">{current}/{max}</Badge>;
    return <Badge variant="default">{current}/{max}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Group Management</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Group Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Beginner Morning Group A"
                />
              </div>

              <div>
                <Label>Level</Label>
                <Select
                  value={formData.level}
                  onValueChange={(value) => setFormData({ ...formData, level: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
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
                <Label>Teacher</Label>
                <Select
                  value={formData.teacher_id}
                  onValueChange={(value) => setFormData({ ...formData, teacher_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.user_id} value={teacher.user_id}>
                        {teacher.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Max Students (up to 18)</Label>
                <Input
                  type="number"
                  min="1"
                  max="18"
                  value={formData.max_students}
                  onChange={(e) => setFormData({ ...formData, max_students: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <Label>Schedule Day</Label>
                <Select
                  value={formData.schedule_day.toString()}
                  onValueChange={(value) => setFormData({ ...formData, schedule_day: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {getDayName(day)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Schedule Time</Label>
                <Input
                  type="time"
                  value={formData.schedule_time}
                  onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
                />
              </div>

              <Button onClick={handleCreateGroup} className="w-full">
                Create Group
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {groups.map((group) => (
          <Card key={group.id} className={!group.is_active ? "opacity-60" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {group.name}
                </CardTitle>
                <div className="flex gap-2">
                  {getCapacityBadge(group.current_students, group.max_students)}
                  <Badge variant={group.is_active ? "default" : "secondary"}>
                    {group.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Level</p>
                  <p className="font-medium capitalize">{group.level}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Teacher</p>
                  <p className="font-medium">{group.teacher.full_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Schedule</p>
                  <p className="font-medium">
                    {getDayName(group.schedule_day)} {group.schedule_time}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-medium">{group.duration_minutes} minutes</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActive(group.id, group.is_active)}
                >
                  {group.is_active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {groups.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center h-32 text-muted-foreground">
            No groups created yet
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GroupManagement;