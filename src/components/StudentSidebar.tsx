import { Home, BookOpen, Brain, Calendar, MessageSquare, Film, Users, Video } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

// items now computed inside component to enable translations

export function StudentSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { t } = useLanguage();

  const items = [
    { title: t('dashboard'), url: '/student', icon: Home },
    { title: t('myGroups'), url: '/student/groups', icon: Users },
    { title: t('recordings'), url: '/student/recordings', icon: Video },
    { title: t('practice'), url: '/student/practice', icon: Brain },
    { title: t('kDramaHub'), url: '/student/kdrama', icon: Film },
    { title: t('conversationPractice'), url: '/student/conversations', icon: MessageSquare },
  ];

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar className={open ? "w-60" : "w-14"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('studentPortal')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
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