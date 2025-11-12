import { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { StudentSidebar } from "@/components/StudentSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Moon, Sun } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { ProfilePictureUpload } from "@/components/student/ProfilePictureUpload";
import { StoryUpload } from "@/components/student/StoryUpload";
import Dashboard from "@/pages/student/Dashboard";
import Practice from "@/pages/student/Practice";
import ConversationPractice from "@/pages/student/ConversationPractice";
import KDrama from "@/pages/student/KDrama";
import MyGroups from "@/pages/student/MyGroups";
import GroupSchedule from "@/pages/student/GroupSchedule";
import VideoLesson from "@/pages/student/VideoLesson";
import Recordings from "@/pages/student/Recordings";
import AdminChat from "@/pages/student/AdminChat";
import MonthlySubscription from "@/pages/student/MonthlySubscription";

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
    // Dispatch event to stop all media streams
    window.dispatchEvent(new CustomEvent('stopAllMedia'));
    
    // Wait a moment for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-background via-background to-muted/20">
        <StudentSidebar />
        <div className="flex-1 flex flex-col">
          {/* Header with gradient and glassmorphism */}
          <header className="h-16 border-b border-border/40 bg-card/80 backdrop-blur-xl flex items-center px-6 sticky top-0 z-10 shadow-sm">
            <SidebarTrigger className="mr-4 hover:scale-110 transition-transform duration-200" />
            <div className="flex-1 flex items-center gap-3">
              <div className="h-8 w-1 bg-gradient-to-b from-primary via-primary/50 to-transparent rounded-full" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {t('studentPortal')}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <StoryUpload />
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDarkMode}
                aria-label="Toggle dark mode"
                className="hover:scale-110 transition-transform duration-200 hover:bg-primary/10"
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5 text-yellow-500 animate-in spin-in-180 duration-500" />
                ) : (
                  <Moon className="w-5 h-5 text-primary animate-in spin-in-180 duration-500" />
                )}
              </Button>
              <LanguageSelector />
              <div className="flex items-center gap-3">
                <ProfilePictureUpload 
                  userId={user?.id || ""} 
                  currentPictureUrl={profile?.profile_picture_url}
                  userName={profile?.full_name || ""}
                />
                <div className="text-right px-3 py-1.5 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                  <p className="text-sm font-semibold">{profile?.full_name || user?.email}</p>
                  <Badge variant="secondary" className="mt-0.5 bg-primary/20 text-primary border-primary/30">
                    {t('student')}
                  </Badge>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
                className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-all duration-200"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t('signOut')}
              </Button>
            </div>
          </header>

          {/* Main Content with animated background */}
          <main className="flex-1 p-6 overflow-auto relative">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>
            <div className="max-w-7xl mx-auto relative z-10 animate-fade-in"
            >
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="groups" element={<MyGroups />} />
              <Route path="recordings" element={<Recordings />} />
              <Route path="schedule" element={<GroupSchedule />} />
              <Route path="video-lesson" element={<VideoLesson />} />
              <Route path="practice" element={<Practice />} />
              <Route path="kdrama" element={<KDrama />} />
              <Route path="conversations" element={<ConversationPractice />} />
              <Route path="admin-chat" element={<AdminChat />} />
              <Route path="subscription" element={<MonthlySubscription />} />
            </Routes>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default StudentLayout;
