import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface SignUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "student" | "teacher";
  onSwitchToSignIn: () => void;
}

// Validation schemas
const authSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Please enter a valid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" })
    .max(72, { message: "Password must be less than 72 characters" }),
});

const teacherSchema = authSchema.extend({
  topikLevel: z
    .string()
    .optional()
    .transform((val) => val?.trim()),
});

const SignUpDialog = ({ open, onOpenChange, defaultTab = "student", onSwitchToSignIn }: SignUpDialogProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  // Student form state
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPassword, setStudentPassword] = useState("");

  // Teacher form state
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [topikLevel, setTopikLevel] = useState("");

  const handleStudentSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validated = authSchema.parse({
        email: studentEmail,
        password: studentPassword,
      });

      const redirectUrl = `${window.location.origin}/`;

      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            role: "student",
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "Account already exists",
            description: "This email is already registered. Please sign in instead.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sign up failed",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      toast({
        title: "Account created! 🎉",
        description: "Welcome to Lingo! You can now start learning.",
      });

      // Reset form
      setStudentEmail("");
      setStudentPassword("");
      onOpenChange(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        toast({
          title: "Validation error",
          description: firstError.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validated = teacherSchema.parse({
        email: teacherEmail,
        password: teacherPassword,
        topikLevel: topikLevel,
      });

      const redirectUrl = `${window.location.origin}/`;

      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            role: "teacher",
            topik_level: validated.topikLevel || null,
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "Account already exists",
            description: "This email is already registered. Please sign in instead.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sign up failed",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      toast({
        title: "Teacher account created! 🎉",
        description: "Welcome to Lingo! Your teacher dashboard is ready.",
      });

      // Reset form
      setTeacherEmail("");
      setTeacherPassword("");
      setTopikLevel("");
      onOpenChange(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        toast({
          title: "Validation error",
          description: firstError.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('getStartedWith')}</DialogTitle>
          <DialogDescription>
            {t('chooseRole')}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsContent value="student" className="space-y-4 pt-4">
            <form onSubmit={handleStudentSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="student-email">{t('email')}</Label>
                <Input
                  id="student-email"
                  type="email"
                  placeholder="you@example.com"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  required
                  disabled={loading}
                  maxLength={255}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-password">{t('password')}</Label>
                <Input
                  id="student-password"
                  type="password"
                  placeholder="••••••••"
                  value={studentPassword}
                  onChange={(e) => setStudentPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                  maxLength={72}
                  autoComplete="new-password"
                />
                <p className="text-xs text-muted-foreground">
                  {t('mustBeChars')}
                </p>
              </div>
              <Button className="w-full" variant="hero" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('creatingAccount')}
                  </>
                ) : (
                  t('startLearningFree')
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                {t('bySigningUp')}
              </p>
            </form>
          </TabsContent>
        </Tabs>

        <div className="text-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {t('alreadyHaveAccount')}{" "}
            <button
              type="button"
              className="text-primary hover:underline font-medium"
              onClick={() => {
                onOpenChange(false);
                onSwitchToSignIn();
              }}
              disabled={loading}
            >
              {t('signInNow')}
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SignUpDialog;