import { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { StudentSidebar } from "@/components/StudentSidebar";
import { SupportButton } from "@/components/SupportButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Moon, Sun } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import Dashboard from "@/pages/student/Dashboard";
import MyPackage from "@/pages/student/MyPackage";
import BookLesson from "@/pages/student/BookLesson";
import Lessons from "@/pages/student/Lessons";
import Practice from "@/pages/student/Practice";
import TopikPrep from "@/pages/student/TopikPrep";
import ConversationPractice from "@/pages/student/ConversationPractice";
import KDrama from "@/pages/student/KDrama";
import MyGroups from "@/pages/student/MyGroups";
import GroupSchedule from "@/pages/student/GroupSchedule";

const StudentLayout = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { t } = useLanguage();

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
            <div className="flex-1 flex items-center gap-3">
              <h1 className="text-xl font-bold">{t('studentPortal')}</h1>
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
                <p className="text-sm font-medium">{profile?.full_name || user?.email}</p>
                <Badge variant="secondary">{t('student')}</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                {t('signOut')}
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
              <Route path="groups" element={<MyGroups />} />
              <Route path="schedule" element={<GroupSchedule />} />
              <Route path="practice" element={<Practice />} />
              <Route path="kdrama" element={<KDrama />} />
              <Route path="topik" element={<TopikPrep />} />
              <Route path="conversations" element={<ConversationPractice />} />
            </Routes>
            </div>
          </main>
        </div>
      </div>
      <SupportButton />
    </SidebarProvider>
  );
};

export default StudentLayout;
