import { Card } from "@/components/ui/card";
import { Brain, Mic, Users, Trophy, Lightbulb, Target } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Features = () => {
  const { t } = useLanguage();
  
  const features = [
    {
      icon: Brain,
      title: t('aiCoPilot'),
      description: t('aiCoPilotDesc'),
    },
    {
      icon: Mic,
      title: t('multimodalLearning'),
      description: t('multimodalDesc'),
    },
    {
      icon: Users,
      title: t('hybridTeaching'),
      description: t('hybridTeachingDesc'),
    },
    {
      icon: Trophy,
      title: t('topikPathway'),
      description: t('topikPathwayDesc'),
    },
    {
      icon: Lightbulb,
      title: t('adaptiveCurriculum'),
      description: t('adaptiveCurriculumDesc'),
    },
    {
      icon: Target,
      title: t('fiftyAIPersonas'),
      description: t('fiftyAIPersonasDesc'),
    },
  ];

  return (
    <section className="py-20 md:py-32 bg-gradient-subtle">
      <div className="container px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            {t('mostAdvancedExperience')}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('cuttingEdgeAI')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="p-6 hover:shadow-elegant transition-all duration-300 hover:-translate-y-1 bg-card border-border"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-accent flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
