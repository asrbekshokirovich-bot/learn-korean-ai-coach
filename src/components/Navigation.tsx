import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Menu, X, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SignUpDialog from "./SignUpDialog";
import SignInDialog from "./SignInDialog";
import { supabase } from "@/integrations/supabase/client";
import { LanguageSelector } from "./LanguageSelector";

const Navigation = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);

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

  const navItems = [
    { label: "Features", href: "#features" },
    { label: "Teaching Modes", href: "#modes" },
    { label: "Pricing", href: "#pricing" },
    { label: "For Teachers", href: "#teachers" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center">
              <span className="text-white font-bold text-sm">한</span>
            </div>
            <span className="text-xl font-bold">Korean AI</span>
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
            <LanguageSelector />
            {isAdmin && (
              <Button variant="outline" onClick={() => navigate("/admin")}>
                <Settings className="w-4 h-4 mr-2" />
                Admin Dashboard
              </Button>
            )}
            {!user && (
              <>
                <Button variant="ghost" onClick={() => setSignInOpen(true)}>
                  Sign In
                </Button>
                <Button variant="hero" onClick={() => setSignUpOpen(true)}>
                  Start Free
                </Button>
              </>
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
                    Admin Dashboard
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
                      Sign In
                    </Button>
                    <Button 
                      variant="hero" 
                      className="w-full" 
                      onClick={() => { 
                        setSignUpOpen(true); 
                        setMobileMenuOpen(false); 
                      }}
                    >
                      Start Free
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