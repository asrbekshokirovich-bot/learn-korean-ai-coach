import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, Check } from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { toast } from "sonner";

const MonthlySubscription = () => {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const currentMonth = startOfMonth(new Date());
      
      const { data, error } = await supabase
        .from("monthly_subscriptions")
        .select("*")
        .eq("student_id", user.id)
        .eq("month_period", format(currentMonth, "yyyy-MM-dd"))
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setSubscription(data);
    } catch (error: any) {
      toast.error("Failed to load subscription");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'overdue': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
          Monthly Subscription
        </h1>
        <p className="text-lg text-muted-foreground">
          Unlock unlimited access to Korean learning with professional teachers
        </p>
      </div>

      <Card className="p-6 border-2 shadow-glow bg-gradient-to-br from-card to-card/50">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Hanguk Korean - Unlimited</h2>
            <p className="text-muted-foreground">
              Access to all group classes and learning materials
            </p>
          </div>
          {subscription && (
            <Badge className={getStatusColor(subscription.payment_status)}>
              {subscription.payment_status.toUpperCase()}
            </Badge>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Monthly Fee</div>
            <div className="text-3xl font-bold">500,000 UZS</div>
            <div className="text-xs text-muted-foreground mt-1">per month</div>
          </div>

          {subscription && (
            <div>
              <div className="text-sm text-muted-foreground mb-1">Current Period</div>
              <div className="text-xl font-semibold">
                {format(new Date(subscription.month_period), "MMMM yyyy")}
              </div>
              {subscription.payment_date && (
                <div className="text-xs text-muted-foreground mt-1">
                  Paid on {format(new Date(subscription.payment_date), "MMM d, yyyy")}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-2">
            <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span>Unlimited access to all group classes</span>
          </div>
          <div className="flex items-start gap-2">
            <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span>AI-powered learning assistance</span>
          </div>
          <div className="flex items-start gap-2">
            <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span>Access to K-Drama content</span>
          </div>
          <div className="flex items-start gap-2">
            <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span>Conversation practice tools</span>
          </div>
          <div className="flex items-start gap-2">
            <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span>Progress tracking and analytics</span>
          </div>
        </div>

        {!subscription || subscription.payment_status !== 'paid' ? (
          <div className="border-t pt-6">
            <div className="bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10 p-6 rounded-lg mb-4 border-2 border-primary/20">
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Ready to Start Learning?
              </h3>
              <p className="text-sm text-muted-foreground mb-1">
                Contact our admin team to set up your monthly subscription and get started with unlimited Korean lessons today!
              </p>
            </div>
            <Button 
              className="w-full shadow-elegant hover:shadow-glow transition-all duration-300 hover:scale-105" 
              size="lg"
              onClick={() => navigate("/student/admin-chat")}
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Contact Admin for Payment
            </Button>
          </div>
        ) : (
          <div className="border-t pt-6">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Check className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-900 dark:text-green-100">
                  Active Subscription
                </span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">
                Your subscription is active for {format(new Date(subscription.month_period), "MMMM yyyy")}
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default MonthlySubscription;
