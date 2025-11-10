import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Menu, X, Settings, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SignUpDialog from "./SignUpDialog";
import SignInDialog from "./SignInDialog";
import { supabase } from "@/integrations/supabase/client";
import { LanguageSelector } from "./LanguageSelector";
import lingoLogo from "@/assets/lingo-logo-new.png";
import { useLanguage } from "@/contexts/LanguageContext";

const Navigation = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);
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
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);

    if (session?.user) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      setIsAdmin(!!roleData);
    } else {
      setIsAdmin(false);
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

  const navItems = [
    { label: t('features'), href: "#features" },
    { label: t('teachingModes'), href: "#modes" },
    { label: t('pricing'), href: "#pricing" },
    { label: t('forTeachers'), href: "#teachers" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container px-4">
        <div className="flex items-center justify-between h-16">
          <div 
            className="flex items-center gap-3 cursor-pointer px-3 py-2 rounded-lg bg-white dark:bg-white/10 border border-border/50 hover:border-primary/50 transition-all hover:shadow-elegant" 
            onClick={() => navigate("/")}
          >
            <img src={lingoLogo} alt="Lingo" className="h-8 w-auto drop-shadow-sm" />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <LanguageSelector />
            {isAdmin && (
              <Button variant="outline" onClick={() => navigate("/admin")}>
                <Settings className="w-4 h-4 mr-2" />
                {t('adminDashboard')}
              </Button>
            )}
            {!user ? (
              <>
                <Button variant="ghost" onClick={() => setSignInOpen(true)}>
                  {t('signIn')}
                </Button>
                <Button variant="hero" onClick={() => setSignUpOpen(true)}>
                  {t('startFree')}
                </Button>
              </>
            ) : (
              <Button variant="ghost" onClick={() => setSignInOpen(true)}>
                {t('signIn')}
              </Button>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-4">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleDarkMode}
                    aria-label="Toggle dark mode"
                    className="w-full justify-start"
                  >
                    {isDarkMode ? (
                      <>
                        <Sun className="w-5 h-5 mr-2" />
                        {t('lightMode')}
                      </>
                    ) : (
                      <>
                        <Moon className="w-5 h-5 mr-2" />
                        {t('darkMode')}
                      </>
                    )}
                  </Button>
                </div>
                <LanguageSelector />
                {isAdmin && (
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => { 
                      navigate("/admin"); 
                      setMobileMenuOpen(false); 
                    }}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    {t('adminDashboard')}
                  </Button>
                )}
                {!user && (
                  <>
                    <Button 
                      variant="ghost" 
                      className="w-full" 
                      onClick={() => { 
                        setSignInOpen(true); 
                        setMobileMenuOpen(false); 
                      }}
                    >
                      {t('signIn')}
                    </Button>
                    <Button 
                      variant="hero" 
                      className="w-full" 
                      onClick={() => { 
                        setSignUpOpen(true); 
                        setMobileMenuOpen(false); 
                      }}
                    >
                      {t('startFree')}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <SignUpDialog 
        open={signUpOpen} 
        onOpenChange={setSignUpOpen}
        onSwitchToSignIn={() => setSignInOpen(true)}
      />
      <SignInDialog 
        open={signInOpen} 
        onOpenChange={setSignInOpen}
        onSwitchToSignUp={() => setSignUpOpen(true)}
      />
    </nav>
  );
};

export default Navigation;