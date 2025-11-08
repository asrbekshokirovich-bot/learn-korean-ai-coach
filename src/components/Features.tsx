import { Card } from "@/components/ui/card";
import { Brain, Mic, Users, Trophy, Lightbulb, Target } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Co-Pilot",
    description: "Real-time pronunciation feedback with 3D mouth models, grammar correction, and cultural nuance detection.",
  },
  {
    icon: Mic,
    title: "Multimodal Learning",
    description: "Speech, writing, and handwriting analysis. Practice with Seoul, Busan, Jeju, and Gyeongsang accents.",
  },
  {
    icon: Users,
    title: "Hybrid Teaching",
    description: "Choose between certified native speakers, AI avatars, or group classes with built-in AI assistance.",
  },
  {
    icon: Trophy,
    title: "TOPIK Pathway",
    description: "AI-generated official-style mock exams with predictive scoring to reach Level 6 certification.",
  },
  {
    icon: Lightbulb,
    title: "Adaptive Curriculum",
    description: "Daily personalized lessons based on your performance gaps, interests, and learning style.",
  },
  {
    icon: Target,
    title: "50+ AI Personas",
    description: "Practice with K-drama actors, business professionals, K-pop idols—each with contextual memory.",
  },
];

const Features = () => {
  return (
    <section className="py-20 md:py-32 bg-gradient-subtle">
      <div className="container px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            The Most Advanced Korean Learning Experience
          </h2>
          <p className="text-lg text-muted-foreground">
            Combining cutting-edge AI technology with expert human instruction for unmatched results
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