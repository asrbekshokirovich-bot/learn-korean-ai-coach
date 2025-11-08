import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "0",
    description: "Try AI-powered learning",
    features: [
      "30 AI minutes/day",
      "Basic pronunciation feedback",
      "5 AI personas",
      "Community access",
    ],
    cta: "Start Free",
    variant: "outline" as const,
  },
  {
    name: "Pro",
    price: "19",
    description: "Serious learners",
    features: [
      "Unlimited AI practice",
      "400 human teacher minutes/mo",
      "50+ AI personas",
      "TOPIK mock tests",
      "Homework AI assistant",
      "Progress analytics",
    ],
    cta: "Start Pro",
    variant: "default" as const,
    popular: true,
  },
  {
    name: "Elite",
    price: "49",
    description: "Accelerated mastery",
    features: [
      "Everything in Pro",
      "Unlimited human lessons",
      "VR classroom access",
      "Personal AI clone",
      "Priority teacher matching",
      "Accent conversion tools",
      "Enterprise certificates",
    ],
    cta: "Go Elite",
    variant: "hero" as const,
  },
];

const Pricing = () => {
  return (
    <section className="py-20 md:py-32 bg-gradient-subtle">
      <div className="container px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Flexible Plans for Every Learner
          </h2>
          <p className="text-lg text-muted-foreground">
            Start free, upgrade anytime. All plans include AI assistance.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative p-8 ${
                plan.popular
                  ? "border-2 border-primary shadow-elegant scale-105"
                  : "border-border"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-accent text-white text-sm font-medium rounded-full">
                  Most Popular
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button className="w-full" variant={plan.variant} size="lg">
                {plan.cta}
              </Button>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-12">
          Enterprise licenses available for schools and organizations.{" "}
          <button className="text-primary hover:underline">Contact sales</button>
        </p>
      </div>
    </section>
  );
};

export default Pricing;