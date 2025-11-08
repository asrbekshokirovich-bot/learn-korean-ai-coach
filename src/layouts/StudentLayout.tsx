import { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { StudentSidebar } from "@/components/StudentSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut } from "lucide-react";
import Dashboard from "@/pages/student/Dashboard";
import MyPackage from "@/pages/student/MyPackage";
import BookLesson from "@/pages/student/BookLesson";
import Lessons from "@/pages/student/Lessons";
import Practice from "@/pages/student/Practice";
import TopikPrep from "@/pages/student/TopikPrep";

const StudentLayout = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setProfile(profileData);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <StudentSidebar />
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b bg-card flex items-center px-4 sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <div className="flex-1">
              <h1 className="text-xl font-bold">TOPIK CLUB Student Portal</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">{profile?.full_name || user?.email}</p>
                <Badge variant="secondary">Student</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 bg-gradient-subtle overflow-auto">
            <div className="max-w-7xl mx-auto">
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="package" element={<MyPackage />} />
              <Route path="book" element={<BookLesson />} />
              <Route path="lessons" element={<Lessons />} />
              <Route path="practice" element={<Practice />} />
              <Route path="topik" element={<TopikPrep />} />
            </Routes>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default StudentLayout;
