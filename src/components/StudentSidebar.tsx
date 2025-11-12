import { Home, BookOpen, Brain, Calendar, MessageSquare, Film, Users, Video, CreditCard, Sparkles, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

// items now computed inside component to enable translations

export function StudentSidebar() {
  const { open, setOpen, isMobile } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { t } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
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

  const items = [
    { title: t('dashboard'), url: '/student', icon: Home },
    { title: t('myGroups'), url: '/student/groups', icon: Users },
    { title: 'Subscription', url: '/student/subscription', icon: CreditCard },
    { title: t('recordings'), url: '/student/recordings', icon: Video },
    { title: 'Chat with Admin', url: '/student/admin-chat', icon: MessageSquare },
    { title: t('practice'), url: '/student/practice', icon: Brain },
    { title: t('kDramaHub'), url: '/student/kdrama', icon: Film },
    { title: t('conversationPractice'), url: '/student/conversations', icon: Brain },
  ];

  const handleNavClick = () => {
    // Auto-close sidebar on mobile after navigation
    if (isMobile && open) {
      setOpen(false);
    }
  };

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar className={open ? "w-64 border-r border-border/40" : "w-14"} collapsible="icon">
      <SidebarHeader className={open ? "p-4" : "p-2"}>
        {open ? (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              <span className="font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Hanguk Learning
              </span>
            </div>
            
            {/* Profile Section */}
            <div className="flex items-center gap-3 px-2 py-3 rounded-lg bg-muted/50 border border-border/40">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                <AvatarImage src={profile?.profile_picture_url} />
                <AvatarFallback className="bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {profile?.full_name || user?.email || 'Student'}
                </p>
                <Badge variant="secondary" className="mt-0.5 h-4 text-xs">
                  {t('student')}
                </Badge>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-2">
            <Avatar className="h-8 w-8 ring-2 ring-primary/20">
              <AvatarImage src={profile?.profile_picture_url} />
              <AvatarFallback className="bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </SidebarHeader>
      
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className={open ? "px-2" : "px-0"}>{open && t('studentPortal')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {items.map((item, index) => (
                <SidebarMenuItem key={item.url} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      onClick={handleNavClick}
                      className="group relative overflow-hidden hover:bg-primary/10 transition-all duration-200 rounded-lg"
                      activeClassName="bg-gradient-to-r from-primary/20 to-primary/10 text-primary font-semibold border-l-2 border-primary shadow-sm"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      <item.icon className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                      {open && <span className="ml-2">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}