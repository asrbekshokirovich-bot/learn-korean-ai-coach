import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface SignInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchToSignUp: () => void;
}

const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Please enter a valid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  password: z
    .string()
    .min(1, { message: "Password is required" })
    .max(72, { message: "Password must be less than 72 characters" }),
});

const SignInDialog = ({ open, onOpenChange, onSwitchToSignUp }: SignInDialogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validated = signInSchema.parse({
        email,
        password,
      });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: t('invalidCredentials'),
            description: t('emailPasswordIncorrect'),
            variant: "destructive",
          });
        } else if (error.message.includes("Email not confirmed")) {
          toast({
            title: t('emailNotConfirmed'),
            description: t('checkEmailConfirm'),
            variant: "destructive",
          });
        } else {
          toast({
            title: t('signInFailed'),
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      // Check user role and redirect
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle();

      toast({
        title: "Welcome back! 👋",
        description: "You've successfully signed in.",
      });

      // Reset form
      setEmail("");
      setPassword("");
      onOpenChange(false);

      // Redirect based on role
      if (roleData?.role === "admin") {
        navigate("/admin");
      } else if (roleData?.role === "teacher") {
        navigate("/teacher");
      } else {
        navigate("/student");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        toast({
          title: t('validationError'),
          description: firstError.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: t('error'),
          description: t('unexpectedError'),
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('welcomeBack')}</DialogTitle>
          <DialogDescription>
            {t('signInToContinue')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSignIn} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="signin-email">{t('email')}</Label>
            <Input
              id="signin-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              maxLength={255}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="signin-password">{t('password')}</Label>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => {
                  toast({
                    title: t('forgotPassword'),
                    description: "Password reset functionality coming soon!",
                  });
                }}
              >
                {t('forgotPassword')}
              </button>
            </div>
            <Input
              id="signin-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              maxLength={72}
              autoComplete="current-password"
            />
          </div>

          <Button className="w-full" variant="hero" type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('signingIn')}
              </>
            ) : (
              t('signIn')
            )}
          </Button>

          <div className="text-center pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {t('dontHaveAccount')}{" "}
              <button
                type="button"
                className="text-primary hover:underline font-medium"
                onClick={() => {
                  onOpenChange(false);
                  onSwitchToSignUp();
                }}
                disabled={loading}
              >
                {t('signUpNow')}
              </button>
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SignInDialog;