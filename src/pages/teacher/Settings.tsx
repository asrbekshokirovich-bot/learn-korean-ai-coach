import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ProfilePictureUpload } from "@/components/student/ProfilePictureUpload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, User, Lock, Globe, Bell, LogOut } from "lucide-react";

export default function TeacherSettings() {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  
  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [lessonReminders, setLessonReminders] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }

      setUser(user);
      setEmail(user.email || "");

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setFullName(profileData.full_name || "");
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      toast.error(t('errorLoadingData') || "Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success(t('profileUpdated') || "Profile updated successfully");
      await loadUserData();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(t('errorUpdatingProfile') || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error(t('fillAllFields') || "Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('passwordsDoNotMatch') || "Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t('passwordTooShort') || "Password must be at least 6 characters");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success(t('passwordChanged') || "Password changed successfully");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error(t('errorChangingPassword') || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('settings')}</h1>
        <p className="text-muted-foreground mt-1">{t('settingsDescription')}</p>
      </div>

      <Separator />

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>{t('profileSettings')}</CardTitle>
          </div>
          <CardDescription>{t('profileSettingsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <ProfilePictureUpload
              userId={user?.id}
              currentPictureUrl={profile?.profile_picture_url}
              userName={profile?.full_name}
            />
            <div className="flex-1 space-y-4 w-full">
              <div className="space-y-2">
                <Label htmlFor="fullName">{t('fullName')}</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t('enterFullName')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">{t('emailCannotBeChanged')}</p>
              </div>
            </div>
          </div>
          <Button onClick={handleUpdateProfile} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('saveChanges')}
          </Button>
        </CardContent>
      </Card>

      {/* Password Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <CardTitle>{t('passwordSettings')}</CardTitle>
          </div>
          <CardDescription>{t('passwordSettingsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t('newPassword')}</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('enterNewPassword')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('confirmNewPassword')}
            />
          </div>
          <Button onClick={handleChangePassword} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('changePassword')}
          </Button>
        </CardContent>
      </Card>

      {/* Language Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle>{t('languageSettings')}</CardTitle>
          </div>
          <CardDescription>{t('languageSettingsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="language">{t('preferredLanguage')}</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uz">O'zbekcha</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ko">한국어</SelectItem>
                <SelectItem value="ru">Русский</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>{t('notificationSettings')}</CardTitle>
          </div>
          <CardDescription>{t('notificationSettingsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="lessonReminders">{t('lessonReminders')}</Label>
              <p className="text-sm text-muted-foreground">{t('lessonRemindersDescription')}</p>
            </div>
            <Switch
              id="lessonReminders"
              checked={lessonReminders}
              onCheckedChange={setLessonReminders}
            />
          </div>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">{t('accountActions')}</CardTitle>
          <CardDescription>{t('accountActionsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="destructive" 
            onClick={handleSignOut}
            className="w-full sm:w-auto"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t('signOut')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
