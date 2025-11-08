import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Loader2, UserPlus, Users, GraduationCap, LogOut, Trash2, DollarSign, Moon, Sun } from "lucide-react";
import { z } from "zod";
import Finance from "@/pages/admin/Finance";
import { LanguageSelector } from "@/components/LanguageSelector";

interface Teacher {
  user_id: string;
  email: string;
  full_name: string | null;
  topik_level: string | null;
  created_at: string;
}

interface Student {
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

const teacherSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(72),
  full_name: z.string().trim().min(1, { message: "Name is required" }).max(100),
  topik_level: z.string().optional(),
});

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Create teacher form state
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [teacherTopik, setTeacherTopik] = useState("");

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

  const handleDeleteUser = async (userId: string, userType: string) => {
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

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Manage teachers and students
              </p>
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
        <Tabs defaultValue="teachers" className="space-y-6">
          <TabsList>
            <TabsTrigger value="teachers">
              <GraduationCap className="w-4 h-4 mr-2" />
              Teachers ({teachers.length})
            </TabsTrigger>
            <TabsTrigger value="students">
              <Users className="w-4 h-4 mr-2" />
              Students ({students.length})
            </TabsTrigger>
            <TabsTrigger value="finance">
              <DollarSign className="w-4 h-4 mr-2" />
              Finance
            </TabsTrigger>
          </TabsList>

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
                    <TableHead>TOPIK Level</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : teachers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
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
                          {teacher.topik_level ? (
                            <Badge variant="secondary">{teacher.topik_level}</Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(teacher.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(teacher.user_id, "teacher")}
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

          {/* Finance Tab */}
          <TabsContent value="finance">
            <Finance />
          </TabsContent>
        </Tabs>
      </main>

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
    </div>
  );
};

export default AdminDashboard;