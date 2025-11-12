import { Home, Users, Calendar, DollarSign, Video, Tv, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import hangukLogo from "@/assets/hanguk-logo-icon.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

// items now computed inside component to enable translations

export function TeacherSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { t } = useLanguage();

  const items = [
    { title: t('dashboard'), url: '/teacher', icon: Home },
    { title: t('myGroups'), url: '/teacher/groups', icon: Users },
    { title: t('recordings'), url: '/teacher/recordings', icon: Video },
    { title: t('kDramaHub'), url: '/teacher/kdrama', icon: Tv },
    { title: t('availability'), url: '/teacher/availability', icon: Calendar },
    { title: t('earnings'), url: '/teacher/earnings', icon: DollarSign },
    { title: t('settings'), url: '/teacher/settings', icon: Settings },
  ];

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar className={open ? "w-60 border-r border-border/40" : "w-14"} collapsible="icon">
      <SidebarHeader className="p-2">
        <div className="flex justify-center py-2">
          <img src={hangukLogo} alt="Hanguk" className="h-10 w-auto" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('teacherPortal')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-primary/10 transition-all duration-200 rounded-lg"
                      activeClassName="bg-gradient-to-r from-primary/20 to-accent/10 text-primary font-semibold border-l-2 border-primary"
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