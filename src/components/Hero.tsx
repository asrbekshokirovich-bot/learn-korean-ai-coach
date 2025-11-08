import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { useState } from "react";
import SignUpDialog from "./SignUpDialog";
import SignInDialog from "./SignInDialog";

const Hero = () => {
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background with overlay */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/90 via-primary/70 to-background/95" />
      </div>

      {/* Content */}
      <div className="container relative z-10 px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/80 backdrop-blur-sm border border-border shadow-elegant">
            <Sparkles className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium">AI-Powered Korean Learning Platform</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
            <span className="text-primary-foreground">Master Korean with</span>
            <br />
            <span className="bg-gradient-accent bg-clip-text text-transparent">
              Human Teachers + AI
            </span>
          </h1>

          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            Experience the future of language learning. Real-time pronunciation feedback, 
            personalized AI curriculum, and certified native speakers—all in one platform.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button size="xl" variant="hero" onClick={() => setSignUpOpen(true)}>
              Start Learning Free
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button size="xl" variant="outline" className="bg-card/80 backdrop-blur-sm border-primary-foreground/20 text-card-foreground hover:bg-card" onClick={scrollToFeatures}>
              See How It Works
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-12">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary-foreground">50+</div>
              <div className="text-sm text-primary-foreground/70">AI Personas</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary-foreground">90%</div>
              <div className="text-sm text-primary-foreground/70">TOPIK Pass Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary-foreground">24/7</div>
              <div className="text-sm text-primary-foreground/70">AI Practice</div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10" />
      
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
    </section>
  );
};

export default Hero;