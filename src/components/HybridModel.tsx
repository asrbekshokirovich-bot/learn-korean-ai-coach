import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Bot, Users as UsersIcon } from "lucide-react";

const learningModes = [
  {
    icon: Video,
    title: "1-on-1 with Native Teacher",
    features: [
      "Certified TOPIK 6 instructors",
      "AI co-pilot suggestions in real-time",
      "Custom lesson plans",
      "Flexible scheduling",
    ],
    accent: "from-primary to-primary/80",
  },
  {
    icon: Bot,
    title: "AI Avatar Teacher",
    features: [
      "50+ cultural personas",
      "24/7 availability",
      "Instant pronunciation feedback",
      "Adaptive difficulty",
    ],
    accent: "from-secondary to-accent",
  },
  {
    icon: UsersIcon,
    title: "Group Classes (1:6)",
    features: [
      "Small interactive groups",
      "Real-time AI feedback for all",
      "Peer learning dynamics",
      "Cost-effective",
    ],
    accent: "from-accent to-secondary",
  },
];

const HybridModel = () => {
  return (
    <section className="py-20 md:py-32">
      <div className="container px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Choose Your Learning Style
          </h2>
          <p className="text-lg text-muted-foreground">
            Every session includes AI assistance—whether you choose human teachers, AI avatars, or group classes
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

                <Button className="w-full" variant="outline">
                  Try This Mode
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HybridModel;