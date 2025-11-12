import { Home, BookOpen, Brain, Calendar, MessageSquare, Film, Users, Video, CreditCard, Sparkles, User, GripVertical, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

// Sortable menu item component
const SortableMenuItem = ({ item, open, onClick, isActive }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.url });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isComingSoon = item.comingSoon;

  return (
    <SidebarMenuItem ref={setNodeRef} style={style}>
      <SidebarMenuButton asChild={!isComingSoon}>
        {isComingSoon ? (
          <div className="group relative overflow-hidden rounded-lg flex items-center px-2 py-1.5 opacity-60 cursor-not-allowed">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mr-1 opacity-0 group-hover:opacity-50 transition-opacity">
              <GripVertical className="h-3 w-3" />
            </div>
            <item.icon className="h-4 w-4" />
            {open && (
              <>
                <span className="ml-2 flex-1">{item.title}</span>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 ml-2 border-muted-foreground/30">
                  {item.comingSoonText}
                </Badge>
              </>
            )}
          </div>
        ) : (
          <NavLink
            to={item.url}
            end
            onClick={onClick}
            className="group relative overflow-hidden hover:bg-primary/10 transition-all duration-200 rounded-lg flex items-center"
            activeClassName="bg-gradient-to-r from-primary/20 to-accent/10 text-primary font-semibold border-l-2 border-primary shadow-sm"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-accent/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mr-1 opacity-0 group-hover:opacity-50 transition-opacity">
              <GripVertical className="h-3 w-3" />
            </div>
            <item.icon className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
            {open && <span className="ml-2">{item.title}</span>}
          </NavLink>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

export function StudentSidebar() {
  const { open, setOpen, isMobile } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { t } = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const defaultItems = [
    { title: t('dashboard'), url: '/student', icon: Home },
    { title: t('myGroups'), url: '/student/groups', icon: Users },
    { title: t('subscription'), url: '/student/subscription', icon: CreditCard },
    { title: t('recordings'), url: '/student/recordings', icon: Video },
    { title: t('chatWithAdmin'), url: '/student/admin-chat', icon: MessageSquare },
    { title: t('settings'), url: '/student/settings', icon: Settings },
    { title: t('practice'), url: '/student/practice', icon: Brain, comingSoon: true, comingSoonText: t('comingSoon') },
    { title: t('kDramaHub'), url: '/student/kdrama', icon: Film, comingSoon: true, comingSoonText: t('comingSoon') },
    { title: t('conversationPractice'), url: '/student/conversations', icon: Brain, comingSoon: true, comingSoonText: t('comingSoon') },
  ];

  useEffect(() => {
    loadUserProfile();
    loadMenuOrder();
  }, [t]);

  const loadMenuOrder = () => {
    const saved = localStorage.getItem('studentMenuOrder');
    if (saved) {
      try {
        const savedUrls = JSON.parse(saved);
        const orderedItems = savedUrls
          .map((url: string) => defaultItems.find(item => item.url === url))
          .filter(Boolean);
        
        // Add any new items that weren't in saved order
        const existingUrls = orderedItems.map(item => item.url);
        const newItems = defaultItems.filter(item => !existingUrls.includes(item.url));
        
        setItems([...orderedItems, ...newItems]);
      } catch {
        setItems(defaultItems);
      }
    } else {
      setItems(defaultItems);
    }
  };

  const saveMenuOrder = (newItems: any[]) => {
    const urls = newItems.map(item => item.url);
    localStorage.setItem('studentMenuOrder', JSON.stringify(urls));
  };

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.url === active.id);
        const newIndex = items.findIndex((item) => item.url === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        saveMenuOrder(newItems);
        return newItems;
      });
    }
  };

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
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-hero shadow-lg">
              <Sparkles className="h-5 w-5 text-white animate-pulse" />
              <span className="font-semibold text-white">
                Hanguk Learning
              </span>
            </div>
            
            {/* Profile Section */}
            <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-card border border-border shadow-md hover:shadow-lg transition-shadow duration-200">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                <AvatarImage src={profile?.profile_picture_url} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {profile?.full_name || user?.email || 'Student'}
                </p>
                <Badge variant="secondary" className="mt-0.5 h-5 text-xs px-2">
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map(item => item.url)}
                strategy={verticalListSortingStrategy}
              >
                <SidebarMenu className="space-y-1">
                  {items.map((item) => (
                    <SortableMenuItem
                      key={item.url}
                      item={item}
                      open={open}
                      onClick={handleNavClick}
                      isActive={isActive(item.url)}
                    />
                  ))}
                </SidebarMenu>
              </SortableContext>
            </DndContext>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
