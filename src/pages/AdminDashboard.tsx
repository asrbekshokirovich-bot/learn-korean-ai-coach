import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Users, GraduationCap, LogOut, Trash2, DollarSign, Moon, Sun, Film, Plus, Calendar, MessageCircle, CheckCircle } from "lucide-react";
import { z } from "zod";
import Finance from "@/pages/admin/Finance";
import BookingManagement from "@/components/admin/BookingManagement";
import GroupManagement from "@/pages/admin/GroupManagement";
import StudentChats from "@/pages/admin/StudentChats";
import { LanguageSelector } from "@/components/LanguageSelector";
import hangukLogo from "@/assets/hanguk-logo-new.jpg";

interface Teacher {
  user_id: string;
  email: string;
  full_name: string | null;
  topik_level: string | null;
  teacher_levels: string[];
  created_at: string;
}

interface Student {
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface Admin {
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface KDrama {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  difficulty_level: string | null;
  tags: string[];
  is_live: boolean;
  scheduled_at: string | null;
  episode_number: number;
  season_number: number;
  created_at: string;
}

interface SupportRequest {
  id: string;
  student_id: string;
  subject: string;
  message: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  student_name?: string;
  student_email?: string;
}

const teacherSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(72),
  full_name: z.string().trim().min(1, { message: "Name is required" }).max(100),
  topik_level: z.string().optional(),
});

const adminSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(72),
  full_name: z.string().trim().min(1, { message: "Name is required" }).max(100),
});

const kdramaSchema = z.object({
  title: z.string().trim().min(1, { message: "Title is required" }).max(200),
  description: z.string().trim().max(1000).optional(),
  video_url: z.string().url({ message: "Please enter a valid URL" }),
  thumbnail_url: z.string().url({ message: "Please enter a valid URL" }).optional(),
  duration_minutes: z.number().int().positive().optional(),
  difficulty_level: z.enum(["beginner", "intermediate", "advanced"]),
  tags: z.string().optional(),
  is_live: z.boolean(),
  scheduled_at: z.string().optional(),
  episode_number: z.number().int().positive(),
  season_number: z.number().int().positive(),
});

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [kdramas, setKdramas] = useState<KDrama[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [adminResponse, setAdminResponse] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createAdminDialogOpen, setCreateAdminDialogOpen] = useState(false);
  const [createDramaDialogOpen, setCreateDramaDialogOpen] = useState(false);
  const [editLevelsDialogOpen, setEditLevelsDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Create teacher form state
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [teacherTopik, setTeacherTopik] = useState("");

  // Create admin form state
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName, setAdminName] = useState("");

  // Create K-Drama form state
  const [dramaTitle, setDramaTitle] = useState("");
  const [dramaDescription, setDramaDescription] = useState("");
  const [dramaVideoUrl, setDramaVideoUrl] = useState("");
  const [dramaThumbnailUrl, setDramaThumbnailUrl] = useState("");
  const [dramaDuration, setDramaDuration] = useState("");
  const [dramaDifficulty, setDramaDifficulty] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [dramaTags, setDramaTags] = useState("");
  const [dramaIsLive, setDramaIsLive] = useState(false);
  const [dramaScheduledAt, setDramaScheduledAt] = useState("");
  const [dramaEpisode, setDramaEpisode] = useState("1");
  const [dramaSeason, setDramaSeason] = useState("1");

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDarkMode(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    loadData();
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load teachers
      const { data: teacherRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "teacher");

      if (teacherRoles && teacherRoles.length > 0) {
        const teacherIds = teacherRoles.map((r) => r.user_id);
        const { data: teacherProfiles } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", teacherIds)
          .order("created_at", { ascending: false });

        setTeachers(teacherProfiles || []);
      }

      // Load students
      const { data: studentRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");

      if (studentRoles && studentRoles.length > 0) {
        const studentIds = studentRoles.map((r) => r.user_id);
        const { data: studentProfiles } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", studentIds)
          .order("created_at", { ascending: false });

        setStudents(studentProfiles || []);
      }

      // Load admins
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminRoles && adminRoles.length > 0) {
        const adminIds = adminRoles.map((r) => r.user_id);
        const { data: adminProfiles } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", adminIds)
          .order("created_at", { ascending: false });

        setAdmins(adminProfiles || []);
      }

      // Load K-Dramas
      const { data: dramaData } = await supabase
        .from("k_dramas")
        .select("*")
        .order("created_at", { ascending: false });

      setKdramas(dramaData || []);

      // Load Support Requests
      const { data: requestsData } = await supabase
        .from("support_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (requestsData) {
        // Fetch student details for each request
        const requestsWithStudentInfo = await Promise.all(
          requestsData.map(async (request) => {
            const { data: studentProfile } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("user_id", request.student_id)
              .single();

            return {
              ...request,
              student_name: studentProfile?.full_name || "Unknown",
              student_email: studentProfile?.email || "Unknown",
            };
          })
        );

        setSupportRequests(requestsWithStudentInfo);
      }
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = teacherSchema.parse({
        email: teacherEmail,
        password: teacherPassword,
        full_name: teacherName,
        topik_level: teacherTopik,
      });

      const redirectUrl = `${window.location.origin}/`;

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            role: "teacher",
            full_name: validated.full_name,
            topik_level: validated.topik_level,
          },
        },
      });

      if (signUpError) throw signUpError;

      toast({
        title: "Teacher account created! 🎉",
        description: `Account for ${validated.full_name} has been created successfully.`,
      });

      // Reset form
      setTeacherEmail("");
      setTeacherPassword("");
      setTeacherName("");
      setTeacherTopik("");
      setCreateDialogOpen(false);
      loadData();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.issues[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create teacher account",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = adminSchema.parse({
        email: adminEmail,
        password: adminPassword,
        full_name: adminName,
      });

      const redirectUrl = `${window.location.origin}/`;

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            role: "admin",
            full_name: validated.full_name,
          },
        },
      });

      if (signUpError) throw signUpError;

      toast({
        title: "Admin account created! 🎉",
        description: `Account for ${validated.full_name} has been created successfully.`,
      });

      // Reset form
      setAdminEmail("");
      setAdminPassword("");
      setAdminName("");
      setCreateAdminDialogOpen(false);
      loadData();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.issues[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create admin account",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userType: string) => {
    // Prevent deleting yourself
    if (userId === currentUser?.id) {
      toast({
        title: "Cannot delete yourself",
        description: "You cannot delete your own admin account.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete this ${userType}?`)) return;

    try {
      // Delete profile
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("user_id", userId);

      if (profileError) throw profileError;

      // Delete role
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (roleError) throw roleError;

      toast({
        title: "User deleted",
        description: `${userType} account has been removed.`,
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleCreateKDrama = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = kdramaSchema.parse({
        title: dramaTitle,
        description: dramaDescription || undefined,
        video_url: dramaVideoUrl,
        thumbnail_url: dramaThumbnailUrl || undefined,
        duration_minutes: dramaDuration ? parseInt(dramaDuration) : undefined,
        difficulty_level: dramaDifficulty,
        tags: dramaTags,
        is_live: dramaIsLive,
        scheduled_at: dramaScheduledAt || undefined,
        episode_number: parseInt(dramaEpisode),
        season_number: parseInt(dramaSeason),
      });

      const { error } = await supabase.from("k_dramas").insert({
        title: validated.title,
        description: validated.description,
        video_url: validated.video_url,
        thumbnail_url: validated.thumbnail_url,
        duration_minutes: validated.duration_minutes,
        difficulty_level: validated.difficulty_level,
        tags: validated.tags ? validated.tags.split(",").map((t) => t.trim()) : [],
        is_live: validated.is_live,
        scheduled_at: validated.scheduled_at,
        episode_number: validated.episode_number,
        season_number: validated.season_number,
      });

      if (error) throw error;

      toast({
        title: "K-Drama posted! 🎬",
        description: `${validated.title} has been added successfully.`,
      });

      // Reset form
      setDramaTitle("");
      setDramaDescription("");
      setDramaVideoUrl("");
      setDramaThumbnailUrl("");
      setDramaDuration("");
      setDramaDifficulty("beginner");
      setDramaTags("");
      setDramaIsLive(false);
      setDramaScheduledAt("");
      setDramaEpisode("1");
      setDramaSeason("1");
      setCreateDramaDialogOpen(false);
      loadData();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.issues[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create K-Drama",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKDrama = async (dramaId: string) => {
    if (!confirm("Are you sure you want to delete this K-Drama?")) return;

    try {
      const { error } = await supabase.from("k_dramas").delete().eq("id", dramaId);

      if (error) throw error;

      toast({
        title: "K-Drama deleted",
        description: "The K-Drama has been removed.",
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleOpenEditLevels = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setSelectedLevels(teacher.teacher_levels || []);
    setEditLevelsDialogOpen(true);
  };

  const handleToggleLevel = (level: string) => {
    setSelectedLevels(prev => 
      prev.includes(level) 
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };

  const handleSaveTeacherLevels = async () => {
    if (!selectedTeacher) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ teacher_levels: selectedLevels })
        .eq("user_id", selectedTeacher.user_id);

      if (error) throw error;

      toast({
        title: "Teacher levels updated",
        description: `${selectedTeacher.full_name}'s teaching levels have been updated.`,
      });

      setEditLevelsDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleOpenResponseDialog = (request: SupportRequest) => {
    setSelectedRequest(request);
    setAdminResponse(request.admin_response || "");
    setResponseDialogOpen(true);
  };

  const handleRespondToRequest = async () => {
    if (!selectedRequest) return;

    try {
      const { error } = await supabase
        .from("support_requests")
        .update({
          admin_response: adminResponse,
          status: "resolved",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      toast({
        title: "Response sent",
        description: "Your response has been saved and the request marked as resolved.",
      });

      setResponseDialogOpen(false);
      setAdminResponse("");
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleMarkAsResolved = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("support_requests")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Request resolved",
        description: "Support request has been marked as resolved.",
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={hangukLogo} alt="Hanguk" className="h-10 w-auto" />
              <div>
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Manage teachers and students
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDarkMode}
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              <LanguageSelector />
              <div className="text-right">
                <p className="text-sm font-medium">{currentUser?.email}</p>
                <Badge variant="secondary">Admin</Badge>
              </div>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="bookings">
              <Calendar className="w-4 h-4 mr-2" />
              Bookings
            </TabsTrigger>
            <TabsTrigger value="groups">
              <Users className="w-4 h-4 mr-2" />
              Groups
            </TabsTrigger>
            <TabsTrigger value="teachers">
              <GraduationCap className="w-4 h-4 mr-2" />
              Teachers ({teachers.length})
            </TabsTrigger>
            <TabsTrigger value="students">
              <Users className="w-4 h-4 mr-2" />
              Students ({students.length})
            </TabsTrigger>
            <TabsTrigger value="admins">
              <UserPlus className="w-4 h-4 mr-2" />
              Admins ({admins.length})
            </TabsTrigger>
            <TabsTrigger value="kdramas">
              <Film className="w-4 h-4 mr-2" />
              K-Dramas ({kdramas.length})
            </TabsTrigger>
            <TabsTrigger value="finance">
              <DollarSign className="w-4 h-4 mr-2" />
              Finance
            </TabsTrigger>
            <TabsTrigger value="chats">
              <MessageCircle className="w-4 h-4 mr-2" />
              Student Chats
            </TabsTrigger>
          </TabsList>

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            <BookingManagement />
          </TabsContent>

          {/* Groups Tab */}
          <TabsContent value="groups">
            <GroupManagement />
          </TabsContent>

          {/* Teachers Tab */}
          <TabsContent value="teachers" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Teacher Management</h2>
              <Button onClick={() => setCreateDialogOpen(true)} variant="hero">
                <UserPlus className="w-4 h-4 mr-2" />
                Create Teacher Account
              </Button>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teaching Levels</TableHead>
                    <TableHead>TOPIK Level</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : teachers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No teachers yet. Create your first teacher account.
                      </TableCell>
                    </TableRow>
                  ) : (
                    teachers.map((teacher) => (
                      <TableRow key={teacher.user_id}>
                        <TableCell className="font-medium">
                          {teacher.full_name || "—"}
                        </TableCell>
                        <TableCell>{teacher.email}</TableCell>
                        <TableCell>
                          {teacher.teacher_levels && teacher.teacher_levels.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {teacher.teacher_levels.map((level) => (
                                <Badge key={level} variant="outline" className="text-xs">
                                  {level}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">No levels set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {teacher.topik_level ? (
                            <Badge variant="secondary">{teacher.topik_level}</Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(teacher.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditLevels(teacher)}
                          >
                            Edit Levels
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(teacher.user_id, "teacher")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-4">
            <h2 className="text-xl font-semibold">Student Management</h2>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No students yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    students.map((student) => (
                      <TableRow key={student.user_id}>
                        <TableCell className="font-medium">
                          {student.full_name || "—"}
                        </TableCell>
                        <TableCell>{student.email}</TableCell>
                        <TableCell>
                          {new Date(student.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(student.user_id, "student")}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Admins Tab */}
          <TabsContent value="admins" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Admin Management</h2>
              <Button onClick={() => setCreateAdminDialogOpen(true)} variant="hero">
                <UserPlus className="w-4 h-4 mr-2" />
                Create Admin Account
              </Button>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : admins.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No admins yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    admins.map((admin) => (
                      <TableRow key={admin.user_id}>
                        <TableCell className="font-medium">
                          {admin.full_name || "—"}
                        </TableCell>
                        <TableCell>
                          {admin.email}
                          {admin.user_id === currentUser?.id && (
                            <Badge variant="secondary" className="ml-2">You</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(admin.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(admin.user_id, "admin")}
                            disabled={admin.user_id === currentUser?.id}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* K-Dramas Tab */}
          <TabsContent value="kdramas" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">K-Drama Management</h2>
              <Button onClick={() => setCreateDramaDialogOpen(true)} variant="hero">
                <Plus className="w-4 h-4 mr-2" />
                Post New K-Drama
              </Button>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Episode</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : kdramas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No K-Dramas posted yet. Add your first one!
                      </TableCell>
                    </TableRow>
                  ) : (
                    kdramas.map((drama) => (
                      <TableRow key={drama.id}>
                        <TableCell className="font-medium">{drama.title}</TableCell>
                        <TableCell>
                          S{drama.season_number} E{drama.episode_number}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{drama.difficulty_level || "—"}</Badge>
                        </TableCell>
                        <TableCell>{drama.duration_minutes ? `${drama.duration_minutes} min` : "—"}</TableCell>
                        <TableCell>
                          {drama.is_live ? (
                            <Badge variant="destructive">Live</Badge>
                          ) : (
                            <Badge>On-Demand</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(drama.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteKDrama(drama.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Finance Tab */}
          <TabsContent value="finance">
            <Finance />
          </TabsContent>

          {/* Student Chats Tab */}
          <TabsContent value="chats">
            <StudentChats />
          </TabsContent>

          {/* Support Requests Tab - REMOVED, replaced with chats */}
          <TabsContent value="support_old" className="space-y-4">
            <h2 className="text-xl font-semibold">Support Requests</h2>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : supportRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No support requests yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    supportRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{request.student_name}</div>
                            <div className="text-xs text-muted-foreground">{request.student_email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{request.subject}</TableCell>
                        <TableCell className="max-w-md truncate">{request.message}</TableCell>
                        <TableCell>
                          {request.status === "pending" ? (
                            <Badge variant="secondary">Pending</Badge>
                          ) : (
                            <Badge variant="outline">Resolved</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(request.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenResponseDialog(request)}
                          >
                            {request.status === "pending" ? "Respond" : "View"}
                          </Button>
                          {request.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsResolved(request.id)}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Admin Dialog */}
      <Dialog open={createAdminDialogOpen} onOpenChange={setCreateAdminDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Admin Account</DialogTitle>
            <DialogDescription>
              Add a new admin to the platform
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAdmin} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="admin-name">Full Name *</Label>
              <Input
                id="admin-name"
                placeholder="John Doe"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
                disabled={loading}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-email">Email *</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@example.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
                disabled={loading}
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password">Password *</Label>
              <Input
                id="admin-password"
                type="password"
                placeholder="••••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
                maxLength={72}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 6 characters
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateAdminDialogOpen(false)}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" variant="hero" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create Admin"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Teacher Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Teacher Account</DialogTitle>
            <DialogDescription>
              Add a new teacher to the platform
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTeacher} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="teacher-name">Full Name *</Label>
              <Input
                id="teacher-name"
                placeholder="John Doe"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                required
                disabled={loading}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="teacher-email">Email *</Label>
              <Input
                id="teacher-email"
                type="email"
                placeholder="teacher@example.com"
                value={teacherEmail}
                onChange={(e) => setTeacherEmail(e.target.value)}
                required
                disabled={loading}
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="teacher-password">Password *</Label>
              <Input
                id="teacher-password"
                type="password"
                placeholder="••••••••"
                value={teacherPassword}
                onChange={(e) => setTeacherPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
                maxLength={72}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 6 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="teacher-topik">TOPIK Certification (Optional)</Label>
              <Input
                id="teacher-topik"
                placeholder="e.g., Level 6"
                value={teacherTopik}
                onChange={(e) => setTeacherTopik(e.target.value)}
                disabled={loading}
                maxLength={50}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" variant="hero" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create Teacher"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create K-Drama Dialog */}
      <Dialog open={createDramaDialogOpen} onOpenChange={setCreateDramaDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post New K-Drama</DialogTitle>
            <DialogDescription>
              Add a new K-Drama episode for students to watch
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateKDrama} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="drama-title">Title *</Label>
              <Input
                id="drama-title"
                placeholder="Episode title"
                value={dramaTitle}
                onChange={(e) => setDramaTitle(e.target.value)}
                required
                disabled={loading}
                maxLength={200}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="drama-season">Season *</Label>
                <Input
                  id="drama-season"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={dramaSeason}
                  onChange={(e) => setDramaSeason(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="drama-episode">Episode *</Label>
                <Input
                  id="drama-episode"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={dramaEpisode}
                  onChange={(e) => setDramaEpisode(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="drama-description">Description</Label>
              <Textarea
                id="drama-description"
                placeholder="Brief description of the episode"
                value={dramaDescription}
                onChange={(e) => setDramaDescription(e.target.value)}
                disabled={loading}
                maxLength={1000}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="drama-video-url">Video URL *</Label>
              <Input
                id="drama-video-url"
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={dramaVideoUrl}
                onChange={(e) => setDramaVideoUrl(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="drama-thumbnail">Thumbnail URL</Label>
              <Input
                id="drama-thumbnail"
                type="url"
                placeholder="https://example.com/thumbnail.jpg"
                value={dramaThumbnailUrl}
                onChange={(e) => setDramaThumbnailUrl(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="drama-duration">Duration (minutes)</Label>
                <Input
                  id="drama-duration"
                  type="number"
                  min="1"
                  placeholder="45"
                  value={dramaDuration}
                  onChange={(e) => setDramaDuration(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="drama-difficulty">Difficulty Level *</Label>
                <Select
                  value={dramaDifficulty}
                  onValueChange={(value: "beginner" | "intermediate" | "advanced") => setDramaDifficulty(value)}
                  disabled={loading}
                >
                  <SelectTrigger id="drama-difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="drama-tags">Tags (comma-separated)</Label>
              <Input
                id="drama-tags"
                placeholder="romance, comedy, slice-of-life"
                value={dramaTags}
                onChange={(e) => setDramaTags(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="drama-is-live"
                checked={dramaIsLive}
                onChange={(e) => setDramaIsLive(e.target.checked)}
                disabled={loading}
                className="w-4 h-4"
              />
              <Label htmlFor="drama-is-live" className="cursor-pointer">
                Is this a live streaming event?
              </Label>
            </div>

            {dramaIsLive && (
              <div className="space-y-2">
                <Label htmlFor="drama-scheduled">Scheduled Date/Time</Label>
                <Input
                  id="drama-scheduled"
                  type="datetime-local"
                  value={dramaScheduledAt}
                  onChange={(e) => setDramaScheduledAt(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDramaDialogOpen(false)}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" variant="hero" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Posting...
                  </>
                ) : (
                  "Post K-Drama"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Teacher Levels Dialog */}
      <Dialog open={editLevelsDialogOpen} onOpenChange={setEditLevelsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Teacher Levels</DialogTitle>
            <DialogDescription>
              Select the levels this teacher can teach
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Teaching Levels</Label>
              <div className="grid grid-cols-2 gap-2">
                {['beginner', 'intermediate', 'advanced', 'topik1', 'topik2'].map((level) => (
                  <div key={level} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`level-${level}`}
                      checked={selectedLevels.includes(level)}
                      onChange={() => handleToggleLevel(level)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor={`level-${level}`} className="text-sm capitalize">
                      {level}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setEditLevelsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveTeacherLevels}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Support Request Response Dialog */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Support Request</DialogTitle>
            <DialogDescription>
              {selectedRequest?.status === "pending" 
                ? "Respond to this support request" 
                : "View support request details"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Student</Label>
              <div className="text-sm">
                <div className="font-medium">{selectedRequest?.student_name}</div>
                <div className="text-muted-foreground">{selectedRequest?.student_email}</div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <div className="text-sm font-medium">{selectedRequest?.subject}</div>
            </div>

            <div className="space-y-2">
              <Label>Message</Label>
              <div className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                {selectedRequest?.message}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Submitted</Label>
              <div className="text-sm text-muted-foreground">
                {selectedRequest && new Date(selectedRequest.created_at).toLocaleString()}
              </div>
            </div>

            {selectedRequest?.status === "resolved" && selectedRequest.admin_response && (
              <div className="space-y-2">
                <Label>Admin Response</Label>
                <div className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                  {selectedRequest.admin_response}
                </div>
              </div>
            )}

            {selectedRequest?.status === "pending" && (
              <div className="space-y-2">
                <Label>Your Response</Label>
                <Textarea
                  placeholder="Type your response here..."
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setResponseDialogOpen(false)}
              >
                {selectedRequest?.status === "pending" ? "Cancel" : "Close"}
              </Button>
              {selectedRequest?.status === "pending" && (
                <Button onClick={handleRespondToRequest} disabled={!adminResponse.trim()}>
                  Send Response & Resolve
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;