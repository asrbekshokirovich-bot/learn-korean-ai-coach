import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SignUpDialog from "@/components/SignUpDialog";
import { useLanguage } from "@/contexts/LanguageContext";

interface Course {
  id: string;
  name: string;
  description: string;
  course_type: string;
  format: string;
  duration_weeks: number;
  sessions_count: number;
  price_usd: number;
  max_students: number;
}

const Courses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [signUpOpen, setSignUpOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("is_active", true)
      .order("price_usd", { ascending: true });

    if (error) {
      toast({
        title: "Error loading courses",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setCourses(data || []);
    }
  };

  const getCourseFeatures = (course: Course) => {
    const features = [];
    if (course.duration_weeks) features.push(`${course.duration_weeks} weeks`);
    if (course.sessions_count) features.push(`${course.sessions_count} sessions`);
    if (course.max_students) features.push(`Max ${course.max_students} students`);
    features.push("AI co-pilot included");
    features.push("Homework + feedback");
    features.push("Progress tracking");
    return features;
  };

  return (
    <section className="py-20 md:py-32 bg-gradient-subtle">
      <div className="container px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            {t('completeCatalog')}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('beginnerToMastery')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {courses.map((course) => (
            <Card key={course.id} className="p-6 flex flex-col">
              <div className="mb-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-xl font-bold">{course.name}</h3>
                  <Badge variant="secondary">{course.format}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {course.description}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">${course.price_usd}</span>
                  {course.course_type === "private_lesson" && (
                    <span className="text-muted-foreground">/lesson</span>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-6 flex-1">
                {getCourseFeatures(course).map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={course.price_usd === 0 ? "outline" : "default"}
                size="lg"
                onClick={() => {
                  toast({
                    title: `${course.name} Selected!`,
                    description: "Let's get you enrolled!",
                  });
                  setSignUpOpen(true);
                }}
              >
                {course.price_usd === 0 ? t('bookFreeTrial') : t('enrollNowBtn')}
              </Button>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-12">
          {t('noRefunds')}{" "}
          <span className="text-primary font-medium">{t('teachersEmployees')}</span>
        </p>
      </div>

      <SignUpDialog open={signUpOpen} onOpenChange={setSignUpOpen} onSwitchToSignIn={() => {}} />
    </section>
  );
};

export default Courses;
