import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GroupChat } from "@/components/GroupChat";
import { Users, Calendar, Clock, MessageCircle, Video, AlertCircle, BookOpen, Plus, Target, User, TrendingUp, BarChart } from "lucide-react";
import { toast } from "sonner";
import { format, getDay, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const MyGroups = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [selectedGroupForCalendar, setSelectedGroupForCalendar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [homeworkDialogOpen, setHomeworkDialogOpen] = useState(false);
  const [homeworkTitle, setHomeworkTitle] = useState("");
  const [homeworkDescription, setHomeworkDescription] = useState("");
  const [homeworkDueDate, setHomeworkDueDate] = useState("");
  const [homeworkFile, setHomeworkFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [groupLessons, setGroupLessons] = useState<any[]>([]);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalUnit, setGoalUnit] = useState("lessons");
  const [goalEndDate, setGoalEndDate] = useState("");
  const [creatingGoal, setCreatingGoal] = useState(false);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentAnalysis, setStudentAnalysis] = useState<any>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroupForCalendar) {
      loadEnrolledStudents(selectedGroupForCalendar.id);
    }
  }, [selectedGroupForCalendar]);

  const loadGroups = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("teacher_id", user.id)
        .eq("status", "active");

      if (error) throw error;

      setGroups(data || []);
    } catch (error: any) {
      toast.error("Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const loadEnrolledStudents = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from("group_enrollments")
        .select(`
          *,
          profiles:student_id (
            user_id,
            full_name,
            email,
            topik_level
          )
        `)
        .eq("group_id", groupId)
        .eq("status", "active");

      if (error) throw error;
      setEnrolledStudents(data || []);
    } catch (error: any) {
      console.error("Error loading students:", error);
      toast.error("Failed to load enrolled students");
    }
  };

  const loadStudentAnalysis = async (studentId: string) => {
    setLoadingAnalysis(true);
    try {
      // Call the edge function to get comprehensive student analysis
      const { data, error } = await supabase.functions.invoke("analyze-student-performance", {
        body: { studentId },
      });

      if (error) throw error;
      setStudentAnalysis(data);
    } catch (error: any) {
      console.error("Error loading student analysis:", error);
      toast.error("Failed to load student analysis");
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleStudentClick = async (student: any) => {
    setSelectedStudent(student);
    setStudentDialogOpen(true);
    await loadStudentAnalysis(student.student_id);
  };

  if (loading) {
    return <div className="text-center py-8">Loading your groups...</div>;
  }

  const getLessonsForDay = (day: Date, groupId?: string) => {
    const dayOfWeek = getDay(day);
    return groups.filter((group) => {
      const matchesGroup = groupId ? group.id === groupId : true;
      const matchesDay = Array.isArray(group.day_of_week)
        ? group.day_of_week.includes(dayOfWeek)
        : group.day_of_week === dayOfWeek;
      return matchesGroup && matchesDay;
    });
  };

  const getNextLesson = (group: any) => {
    const now = new Date();
    const today = getDay(now);
    const groupDays = Array.isArray(group.day_of_week) ? group.day_of_week : [group.day_of_week];
    
    let daysUntilNext = 7;
    let nextDay = -1;
    
    for (const day of groupDays) {
      const diff = (day - today + 7) % 7;
      if (diff < daysUntilNext || (diff === 0 && daysUntilNext === 7)) {
        if (diff === 0) {
          const [hours, minutes] = group.start_time.split(":").map(Number);
          const lessonStart = new Date();
          lessonStart.setHours(hours, minutes, 0, 0);
          if (now > lessonStart) continue;
        }
        daysUntilNext = diff === 0 ? 0 : diff;
        nextDay = day;
      }
    }
    
    if (nextDay === -1) {
      nextDay = Math.min(...groupDays);
      daysUntilNext = (nextDay - today + 7) % 7 || 7;
    }
    
    const nextDate = addDays(now, daysUntilNext);
    return nextDate;
  };

  const handleJoinLesson = (group: any) => {
    const now = new Date();
    const [hours, minutes] = group.start_time.split(":").map(Number);
    const lessonStart = new Date(selectedDate!);
    lessonStart.setHours(hours, minutes, 0, 0);
    const lessonEnd = new Date(lessonStart.getTime() + group.duration_minutes * 60000);

    if (now < lessonStart) {
      const minutesUntil = Math.floor((lessonStart.getTime() - now.getTime()) / 60000);
      toast.error(`Lesson hasn't started yet. It will begin in ${minutesUntil} minutes.`);
      return;
    }

    if (now > lessonEnd) {
      toast.error("This lesson has already ended.");
      return;
    }

    toast.success("Joining lesson...");
    navigate(`/teacher/video-lesson?groupId=${group.id}&groupName=${encodeURIComponent(group.name)}`);
  };

  const loadGroupLessons = async (groupId: string) => {
    try {
      const { data, error }: { data: any[] | null; error: any } = await supabase
        .from("lessons")
        .select("id, scheduled_at, lesson_type")
        .eq("group_id", groupId)
        .order("scheduled_at", { ascending: false });

      if (error) throw error;
      setGroupLessons(data || []);
    } catch (error: any) {
      console.error("Error loading lessons:", error);
      toast.error("Failed to load lessons");
    }
  };

  const handleAssignHomework = async () => {
    if (!selectedGroupForCalendar || !homeworkTitle.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setUploadingFile(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let attachmentUrl = null;
      let attachmentName = null;
      let attachmentSize = null;

      // Upload file if provided
      if (homeworkFile) {
        const fileExt = homeworkFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('homework-files')
          .upload(fileName, homeworkFile);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw new Error("Failed to upload file");
        }

        attachmentUrl = fileName;
        attachmentName = homeworkFile.name;
        attachmentSize = homeworkFile.size;
      }

      // Get all students in this group
      const { data: enrollments, error: enrollError } = await supabase
        .from("group_enrollments")
        .select("student_id")
        .eq("group_id", selectedGroupForCalendar.id)
        .eq("status", "active");

      if (enrollError) throw enrollError;

      // Create homework assignments for each student
      const homeworkData = enrollments.map((enrollment: any) => ({
        teacher_id: user.id,
        student_id: enrollment.student_id,
        title: homeworkTitle,
        description: homeworkDescription || null,
        due_date: homeworkDueDate ? new Date(homeworkDueDate).toISOString() : null,
        status: "assigned",
        lesson_id: selectedLessonId || null,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
        attachment_size: attachmentSize
      }));

      const { error: insertError } = await supabase
        .from("homework_assignments")
        .insert(homeworkData);

      if (insertError) throw insertError;

      toast.success(`Homework assigned to ${enrollments.length} student(s)`);
      setHomeworkDialogOpen(false);
      setHomeworkTitle("");
      setHomeworkDescription("");
      setHomeworkDueDate("");
      setHomeworkFile(null);
      setSelectedLessonId("");
      setGroupLessons([]);
    } catch (error: any) {
      console.error("Error assigning homework:", error);
      toast.error("Failed to assign homework");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!selectedGroupForCalendar || !goalTitle.trim() || !goalTarget || !goalEndDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setCreatingGoal(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create the group goal
      const { data: goalData, error: goalError } = await supabase
        .from("group_goals")
        .insert({
          group_id: selectedGroupForCalendar.id,
          teacher_id: user.id,
          title: goalTitle,
          description: goalDescription,
          target_value: parseFloat(goalTarget),
          unit: goalUnit,
          end_date: goalEndDate,
        })
        .select()
        .single();

      if (goalError) throw goalError;

      // Call edge function to personalize the goal for each student
      const { error: personalizeError } = await supabase.functions.invoke("personalize-goal", {
        body: { groupGoalId: goalData.id },
      });

      if (personalizeError) throw personalizeError;

      toast.success("Goal created and personalized for all students!");
      setGoalDialogOpen(false);
      setGoalTitle("");
      setGoalDescription("");
      setGoalTarget("");
      setGoalUnit("lessons");
      setGoalEndDate("");
    } catch (error: any) {
      console.error("Error creating goal:", error);
      toast.error("Failed to create goal");
    } finally {
      setCreatingGoal(false);
    }
  };

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

  if (selectedGroupForCalendar) {
    const nextLessonDate = getNextLesson(selectedGroupForCalendar);
    const selectedDateLessons = selectedDate ? getLessonsForDay(selectedDate, selectedGroupForCalendar.id) : [];
    
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => setSelectedGroupForCalendar(null)}>
          ← Back to My Groups
        </Button>

        <div>
          <h2 className="text-3xl font-bold mb-2">{selectedGroupForCalendar.name}</h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{selectedGroupForCalendar.level}</Badge>
            <Badge variant={selectedGroupForCalendar.status === "active" ? "default" : "secondary"}>
              {selectedGroupForCalendar.status}
            </Badge>
          </div>
        </div>

        <div className="flex gap-4">
          <Card className="bg-primary/5 border-primary flex-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-primary" />
                Next Lesson
              </CardTitle>
            </CardHeader>
            <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-lg font-semibold">
                      {format(nextLessonDate, "EEEE, MMMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedGroupForCalendar.start_time} ({selectedGroupForCalendar.duration_minutes}min)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedGroupForCalendar.current_students_count} / {selectedGroupForCalendar.max_students} students</span>
                  </div>
                </div>
                <Button 
                  size="lg"
                  onClick={() => {
                    setSelectedDate(nextLessonDate);
                    handleJoinLesson(selectedGroupForCalendar);
                  }}
                >
                  <Video className="w-5 h-5 mr-2" />
                  Join Lesson
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Homework
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={homeworkDialogOpen} onOpenChange={(open) => {
              setHomeworkDialogOpen(open);
              if (open) {
                loadGroupLessons(selectedGroupForCalendar.id);
              }
            }}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Assign Homework
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Assign Homework to {selectedGroupForCalendar.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={homeworkTitle}
                      onChange={(e) => setHomeworkTitle(e.target.value)}
                      placeholder="Enter homework title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={homeworkDescription}
                      onChange={(e) => setHomeworkDescription(e.target.value)}
                      placeholder="Enter homework description"
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lesson">Related Lesson (optional)</Label>
                    <Select value={selectedLessonId} onValueChange={setSelectedLessonId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a lesson" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No specific lesson</SelectItem>
                        {groupLessons.map((lesson) => (
                          <SelectItem key={lesson.id} value={lesson.id}>
                            {format(new Date(lesson.scheduled_at), "MMM d, yyyy")} - {lesson.lesson_type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="datetime-local"
                      value={homeworkDueDate}
                      onChange={(e) => setHomeworkDueDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="attachment">Attachment (optional)</Label>
                    <Input
                      id="attachment"
                      type="file"
                      onChange={(e) => setHomeworkFile(e.target.files?.[0] || null)}
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
                    />
                    {homeworkFile && (
                      <p className="text-xs text-muted-foreground">
                        Selected: {homeworkFile.name} ({(homeworkFile.size / 1024).toFixed(2)} KB)
                      </p>
                    )}
                  </div>
                  <Button 
                    onClick={handleAssignHomework} 
                    className="w-full"
                    disabled={uploadingFile}
                  >
                    {uploadingFile ? "Uploading..." : "Assign Homework"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Group Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Group Goal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Goal for {selectedGroupForCalendar.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="goalTitle">Goal Title *</Label>
                    <Input
                      id="goalTitle"
                      value={goalTitle}
                      onChange={(e) => setGoalTitle(e.target.value)}
                      placeholder="e.g., Complete 10 lessons this month"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goalDescription">Description</Label>
                    <Textarea
                      id="goalDescription"
                      value={goalDescription}
                      onChange={(e) => setGoalDescription(e.target.value)}
                      placeholder="Describe the goal and its purpose"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="goalTarget">Target Value *</Label>
                      <Input
                        id="goalTarget"
                        type="number"
                        value={goalTarget}
                        onChange={(e) => setGoalTarget(e.target.value)}
                        placeholder="10"
                        min="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="goalUnit">Unit *</Label>
                      <Select value={goalUnit} onValueChange={setGoalUnit}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lessons">Lessons</SelectItem>
                          <SelectItem value="hours">Hours</SelectItem>
                          <SelectItem value="assignments">Assignments</SelectItem>
                          <SelectItem value="points">Points</SelectItem>
                          <SelectItem value="words">Words</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goalEndDate">End Date *</Label>
                    <Input
                      id="goalEndDate"
                      type="date"
                      value={goalEndDate}
                      onChange={(e) => setGoalEndDate(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleCreateGoal} 
                    className="w-full"
                    disabled={creatingGoal}
                  >
                    {creatingGoal ? "Creating..." : "Create Goal"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    AI will personalize this goal for each student in the group.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Enrolled Students ({enrolledStudents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {enrolledStudents.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No students enrolled yet</p>
            ) : (
              <div className="space-y-2">
                {enrolledStudents.map((enrollment) => (
                  <button
                    key={enrollment.id}
                    onClick={() => handleStudentClick(enrollment)}
                    className="w-full p-4 border rounded-lg hover:bg-accent transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{enrollment.profiles?.full_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{enrollment.profiles?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{enrollment.profiles?.topik_level || "N/A"}</Badge>
                        <BarChart className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

        <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Student Analysis: {selectedStudent?.profiles?.full_name}
              </DialogTitle>
            </DialogHeader>
            {loadingAnalysis ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-4">Analyzing student performance...</p>
              </div>
            ) : studentAnalysis ? (
              <div className="space-y-6">
                {/* Overall Performance Score */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Overall Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Performance Score</span>
                          <span className="text-2xl font-bold text-primary">
                            {studentAnalysis.performanceScore?.toFixed(1) || 0}/100
                          </span>
                        </div>
                        <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${studentAnalysis.performanceScore || 0}%` }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Proficiency Level</p>
                          <p className="font-semibold">{studentAnalysis.proficiencyLevel || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Attendance</p>
                          <p className="font-semibold">{studentAnalysis.attendance?.rate || 0}%</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Homework Performance */}
                {studentAnalysis.homework && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        Homework Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Completion Rate</span>
                          <span className="font-semibold">{studentAnalysis.homework.completionRate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Average Grade</span>
                          <span className="font-semibold">{studentAnalysis.homework.averageGrade || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Assigned</span>
                          <span className="font-semibold">{studentAnalysis.homework.totalAssigned}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Lesson Reviews */}
                {studentAnalysis.lessonReviews && studentAnalysis.lessonReviews.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Recent Lesson Reviews</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {studentAnalysis.lessonReviews.slice(0, 3).map((review: any, idx: number) => (
                          <div key={idx} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(review.created_at), "MMM d, yyyy")}
                              </span>
                              <Badge>{review.ai_score || "N/A"}/100</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Engagement:</span>
                                <span className="ml-1 font-medium">{review.engagement_score || "N/A"}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Pacing:</span>
                                <span className="ml-1 font-medium">{review.pacing_score || "N/A"}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Strengths & Weaknesses */}
                {(studentAnalysis.strengths || studentAnalysis.weaknesses) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Strengths & Areas for Improvement</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {studentAnalysis.strengths && studentAnalysis.strengths.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2 text-green-600">Strengths</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              {studentAnalysis.strengths.map((strength: string, idx: number) => (
                                <li key={idx} className="text-muted-foreground">{strength}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {studentAnalysis.weaknesses && studentAnalysis.weaknesses.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2 text-orange-600">Areas for Improvement</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              {studentAnalysis.weaknesses.map((weakness: string, idx: number) => (
                                <li key={idx} className="text-muted-foreground">{weakness}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* AI Recommendations */}
                {studentAnalysis.recommendations && (
                  <Card className="bg-primary/5">
                    <CardHeader>
                      <CardTitle className="text-lg">AI Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {studentAnalysis.recommendations}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No analysis data available</p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Lesson Calendar</span>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                >
                  ←
                </Button>
                <span className="text-lg font-normal">{format(currentMonth, "MMMM yyyy")}</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                >
                  →
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center font-semibold text-sm p-2 text-muted-foreground">
                  {day}
                </div>
              ))}
              {eachDayOfInterval({
                start: startOfMonth(currentMonth),
                end: endOfMonth(currentMonth)
              }).map((day, idx) => {
                const dayLessons = getLessonsForDay(day, selectedGroupForCalendar.id);
                const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                const isSelected = selectedDate && format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(day)}
                    className={`min-h-24 p-2 border rounded-lg hover:bg-accent transition-colors ${
                      isToday ? "border-primary" : ""
                    } ${isSelected ? "bg-accent" : ""} ${dayLessons.length > 0 ? "bg-primary/5" : ""}`}
                  >
                    <div className="text-right text-sm font-semibold mb-1">
                      {format(day, "d")}
                    </div>
                    <div className="space-y-1">
                      {dayLessons.map((group, i) => (
                        <div 
                          key={i}
                          className="text-xs bg-primary/20 text-primary px-1 py-0.5 rounded"
                        >
                          {selectedGroupForCalendar.start_time}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {selectedDateLessons.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                Lesson for {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Selected Date"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{selectedGroupForCalendar.name}</h3>
                        <Badge variant="outline" className="mt-1">{selectedGroupForCalendar.level}</Badge>
                      </div>
                      <Badge>{selectedGroupForCalendar.duration_minutes}min</Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedGroupForCalendar.start_time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedGroupForCalendar.current_students_count} students enrolled</span>
                      </div>
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={() => handleJoinLesson(selectedGroupForCalendar)}
                    >
                      <Video className="w-4 h-4 mr-2" />
                      Join Lesson
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold mb-2">My Groups</h2>
        <p className="text-muted-foreground">View and manage your teaching groups</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-2xl font-semibold">Teaching Groups</h3>
        </div>

        {groups.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Groups Assigned</h3>
            <p className="text-muted-foreground">
              You haven't been assigned to any groups yet. Contact an admin to be assigned to groups.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {groups.map((group) => (
              <Card key={group.id} className="p-6">
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

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {group.current_students_count} / {group.max_students} students
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {Array.isArray(group.day_of_week) 
                            ? group.day_of_week.map((d: number) => DAYS_OF_WEEK[d]).join(', ')
                            : DAYS_OF_WEEK[group.day_of_week]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {group.start_time} ({group.duration_minutes}min)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => setSelectedGroupForCalendar(group)}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      View Calendar
                    </Button>
                    <Button onClick={() => setSelectedGroup(group)}>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Open Chat
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyGroups;
