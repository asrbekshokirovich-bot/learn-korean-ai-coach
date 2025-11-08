import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Calendar, Package } from "lucide-react";
import { format, startOfMonth, addMonths } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";

const MyPackage = () => {
  const { t } = useLanguage();
  const [currentPackage, setCurrentPackage] = useState<any>(null);
  const [lessonsCount, setLessonsCount] = useState(4);
  const [pricePerLesson] = useState(20); // $20 per 50-min lesson
  const { toast } = useToast();

  useEffect(() => {
    loadCurrentPackage();
  }, []);

  const loadCurrentPackage = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentMonth = startOfMonth(new Date());
    const { data } = await supabase
      .from("lesson_packages")
      .select("*")
      .eq("student_id", user.id)
      .gte("month_period", currentMonth.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setCurrentPackage(data);
  };

  const handlePurchasePackage = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const nextMonth = startOfMonth(addMonths(new Date(), 1));
    const totalAmount = lessonsCount * pricePerLesson;

    // Check for rollover lessons
    const currentMonth = startOfMonth(new Date());
    const { data: oldPackage } = await supabase
      .from("lesson_packages")
      .select("*")
      .eq("student_id", user.id)
      .eq("month_period", currentMonth.toISOString())
      .eq("status", "active")
      .maybeSingle();

    let rolloverLessons = 0;
    if (oldPackage && oldPackage.lessons_remaining > 0) {
      rolloverLessons = oldPackage.lessons_remaining;
      
      // Mark old package as rolled over
      await supabase
        .from("lesson_packages")
        .update({ status: "rolled_over" })
        .eq("id", oldPackage.id);
    }

    // Create new package
    const { data: newPackage, error: packageError } = await supabase
      .from("lesson_packages")
      .insert({
        student_id: user.id,
        lessons_purchased: lessonsCount,
        lessons_remaining: lessonsCount + rolloverLessons,
        lessons_used: 0,
        price_per_lesson: pricePerLesson,
        total_amount_paid: totalAmount,
        month_period: nextMonth.toISOString(),
        status: "active",
      })
      .select()
      .single();

    if (packageError) {
      toast({
        title: "Error",
        description: packageError.message,
        variant: "destructive",
      });
      return;
    }

    // Create payment record
    const { error: paymentError } = await supabase
      .from("monthly_payments")
      .insert({
        student_id: user.id,
        package_id: newPackage.id,
        amount_paid: totalAmount,
        payment_method: "credit_card",
        payment_status: "completed",
        month_period: nextMonth.toISOString(),
      });

    if (paymentError) {
      toast({
        title: "Error",
        description: paymentError.message,
        variant: "destructive",
      });
      return;
    }

    // Create finance record
    await supabase.from("finance_records").insert({
      record_type: "student_payment",
      amount: totalAmount,
      student_id: user.id,
      description: `Package purchase: ${lessonsCount} lessons`,
      month_period: nextMonth.toISOString(),
    });

    toast({
      title: "Package purchased!",
      description: rolloverLessons > 0 
        ? `${lessonsCount} lessons purchased + ${rolloverLessons} rolled over from previous month`
        : `${lessonsCount} lessons purchased for next month`,
    });

    loadCurrentPackage();
  };

  const totalCost = lessonsCount * pricePerLesson;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">{t('myLessonPackage')}</h2>
        <p className="text-muted-foreground">{t('purchaseAndManage')}</p>
      </div>

      {currentPackage && (
        <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold">{t('currentPackage')}</h3>
              <p className="text-muted-foreground">
                {t('validFor')} {format(new Date(currentPackage.month_period), "MMMM yyyy")}
              </p>
            </div>
            <Badge variant={currentPackage.status === "active" ? "default" : "secondary"}>
              {currentPackage.status}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center p-4 bg-card rounded-lg">
              <Package className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">{t('purchased')}</p>
              <p className="text-2xl font-bold">{currentPackage.lessons_purchased}</p>
            </div>
            <div className="text-center p-4 bg-card rounded-lg">
              <CreditCard className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="text-sm text-muted-foreground">{t('remaining')}</p>
              <p className="text-2xl font-bold">{currentPackage.lessons_remaining}</p>
            </div>
            <div className="text-center p-4 bg-card rounded-lg">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-orange-500" />
              <p className="text-sm text-muted-foreground">{t('used')}</p>
              <p className="text-2xl font-bold">{currentPackage.lessons_used}</p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-card rounded-lg">
            <p className="text-sm text-muted-foreground">{t('totalPaid')}</p>
            <p className="text-xl font-bold">${currentPackage.total_amount_paid}</p>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">{t('purchaseForNextMonth')}</h3>
        <p className="text-sm text-muted-foreground mb-6">
          {t('buyLessonsFor')} {format(startOfMonth(addMonths(new Date(), 1)), "MMMM yyyy")}
        </p>

        <div className="space-y-4">
          <div>
            <Label>{t('numberOfLessons')}</Label>
            <Input
              type="number"
              min="1"
              max="30"
              value={lessonsCount}
              onChange={(e) => setLessonsCount(parseInt(e.target.value))}
              className="mt-2"
            />
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between mb-2">
              <span>{t('pricePerLesson')}</span>
              <span className="font-semibold">${pricePerLesson}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>{t('numberOfLessons')}:</span>
              <span className="font-semibold">{lessonsCount}</span>
            </div>
            <div className="border-t pt-2 mt-2 flex justify-between">
              <span className="font-bold">{t('total')}:</span>
              <span className="font-bold text-xl">${totalCost}</span>
            </div>
          </div>

          <Button className="w-full" size="lg" onClick={handlePurchasePackage}>
            {t('purchasePackage')} - ${totalCost}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            {t('unusedLessonsRollover')}
          </p>
        </div>
      </Card>
    </div>
  );
};

export default MyPackage;
