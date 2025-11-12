import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Bot, Users as UsersIcon } from "lucide-react";
import { useState } from "react";
import SignUpDialog from "./SignUpDialog";
import SignInDialog from "./SignInDialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const HybridModel = () => {
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const learningModes = [
    {
      icon: Video,
      title: t('oneOnOneNativeTeacher'),
      features: [
        t('certifiedTopikInstructors'),
        t('aiCoPilotRealTime'),
        t('customLessonPlans'),
        t('flexibleScheduling'),
      ],
      accent: "from-primary to-primary/80",
    },
    {
      icon: Bot,
      title: t('aiAvatarTeacher'),
      features: [
        t('culturalPersonas'),
        t('availability247'),
        t('instantPronunciation'),
        t('adaptiveDifficulty'),
      ],
      accent: "from-secondary to-accent",
    },
    {
      icon: UsersIcon,
      title: t('groupClasses'),
      features: [
        t('smallInteractiveGroups'),
        t('realTimeAIFeedback'),
        t('peerLearning'),
        t('costEffective'),
      ],
      accent: "from-primary to-accent",
    },
  ];
  return (
    <section className="py-20 md:py-32">
      <div className="container px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            {t('chooseYourLearningStyle')}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('everySessionIncludesAI')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {learningModes.map((mode, index) => (
            <Card
              key={index}
              className="relative overflow-hidden group hover:shadow-elegant transition-all duration-300"
            >
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${mode.accent}`} />
              
              <div className="p-8">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <mode.icon className="w-8 h-8 text-primary" />
                </div>

                <h3 className="text-2xl font-bold mb-4">{mode.title}</h3>

                <ul className="space-y-3 mb-8">
                  {mode.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-secondary mt-2 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => {
                    toast({
                      title: t('modeSelected'),
                      description: t('modeSelectedDesc', { mode: mode.title }),
                    });
                    setSignUpOpen(true);
                  }}
                >
                  {t('tryThisMode')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
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
    </section>
  );
};

export default HybridModel;