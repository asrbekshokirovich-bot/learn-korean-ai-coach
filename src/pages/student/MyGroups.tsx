import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GroupChat } from "@/components/GroupChat";
import { Users, Calendar, Clock, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const MyGroups = () => {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEnrollments();
  }, []);

  const loadEnrollments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("group_enrollments")
        .select(`
          *,
          groups:groups!group_enrollments_group_id_fkey(
            *,
            teacher:profiles!groups_teacher_id_fkey(full_name, email)
          )
        `)
        .eq("student_id", user.id)
        .eq("status", "active");

      if (error) throw error;

      setEnrollments(data || []);
    } catch (error: any) {
      toast.error("Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading your groups...</div>;
  }

  if (selectedGroup) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setSelectedGroup(null)}>
          ← Back to My Groups
        </Button>
        <GroupChat
          groupId={selectedGroup.id}
          teacherId={selectedGroup.teacher_id}
          groupName={selectedGroup.name}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">My Groups</h2>
        <p className="text-muted-foreground">View and chat with your enrolled groups</p>
      </div>

      {enrollments.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Groups Yet</h3>
          <p className="text-muted-foreground">
            You haven't been enrolled in any groups yet. Contact support to join a group!
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {enrollments.map((enrollment) => {
            const group = enrollment.groups;
            return (
              <Card key={enrollment.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{group.name}</h3>
                      <Badge variant="outline">{group.level}</Badge>
                      <Badge variant={group.status === "active" ? "default" : "secondary"}>
                        {group.status}
                      </Badge>
                    </div>

                    {group.description && (
                      <p className="text-muted-foreground mb-4">{group.description}</p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {group.current_students_count} / {group.max_students} students
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{Array.isArray(group.day_of_week) ? group.day_of_week.map((d: number) => DAYS_OF_WEEK[d]).join(', ') : DAYS_OF_WEEK[group.day_of_week]}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {group.start_time} ({group.duration_minutes}min)
                        </span>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Teacher</p>
                        <p className="font-medium">
                          {group.teacher?.full_name || "Not assigned"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs text-muted-foreground">
                        Enrolled on {format(new Date(enrollment.enrolled_at), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>

                  <Button onClick={() => setSelectedGroup(group)}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Open Chat
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyGroups;
