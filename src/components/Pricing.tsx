import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useState } from "react";
import SignUpDialog from "./SignUpDialog";
import SignInDialog from "./SignInDialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const Pricing = () => {
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const plans = [
    {
      name: t('freeTrial'),
      price: "0",
      description: t('diagnosticSession'),
      features: [
        t('oneOnOneDiagnostic'),
        t('aiLevelAssessment'),
        t('personalizedLearningPath'),
        t('noCreditCard'),
      ],
      cta: t('startFreeTrial'),
      variant: "outline" as const,
    },
    {
      name: t('monthlyUnlimited'),
      price: "500,000",
      currency: "UZS",
      description: t('monthlySubscription'),
      features: [
        t('unlimitedGroupClasses'),
        t('aiCoPilotIncluded'),
        t('homeworkGrading'),
        t('progressAnalytics'),
        t('accessAllGroupLessons'),
        t('realTimeChatSupport'),
        t('kdramaContent'),
      ],
      cta: t('getStarted'),
      variant: "default" as const,
      popular: true,
    },
    {
      name: t('topikBootcamp'),
      price: "1,500,000",
      currency: "UZS",
      description: t('intensivePrep'),
      features: [
        t('twelveWeekProgram'),
        t('allMonthlyFeatures'),
        t('topikFocused'),
        t('aiPracticeUnlimited'),
        t('mockTestsIncluded'),
        t('priorityMatching'),
        t('certificate'),
      ],
      cta: t('enrollNow'),
      variant: "hero" as const,
    },
  ];

  return (
    <section className="py-20 md:py-32 bg-gradient-subtle">
      <div className="container px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            {t('flexiblePlans')}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('startFreeUpgrade')}
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
                  {t('mostPopular')}
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold">
                    {plan.currency === "UZS" ? `${plan.price} UZS` : `₩${plan.price}`}
                  </span>
                  {plan.price !== "0" && (
                    <span className="text-muted-foreground">{t('perMonth')}</span>
                  )}
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

              <Button 
                className="w-full" 
                variant={plan.variant} 
                size="lg"
                onClick={() => {
                  toast({
                    title: t('planSelected', { plan: plan.name }),
                    description: t('perfectChoice', { plan: plan.name }),
                  });
                  setSignUpOpen(true);
                }}
              >
                {plan.cta}
              </Button>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-12">
          {t('enterpriseLicenses')}{" "}
          <button 
            className="text-primary hover:underline"
            onClick={() => {
              toast({
                title: t('enterpriseInquiry'),
                description: t('salesContact'),
              });
            }}
          >
            {t('contactSales')}
          </button>
        </p>
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

export default Pricing;
