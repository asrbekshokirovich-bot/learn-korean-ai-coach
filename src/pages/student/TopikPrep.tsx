import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, FileText, Headphones, BookOpen, CheckCircle } from "lucide-react";

const TopikPrep = () => {
  const levels = [
    { level: "TOPIK I (1-2)", description: "Beginner level", color: "bg-green-500" },
    { level: "TOPIK II (3-4)", description: "Intermediate level", color: "bg-blue-500" },
    { level: "TOPIK II (5-6)", description: "Advanced level", color: "bg-purple-500" },
  ];

  const sections = [
    { title: "Reading", icon: BookOpen, questions: 50, color: "text-blue-500" },
    { title: "Listening", icon: Headphones, questions: 50, color: "text-purple-500" },
    { title: "Writing", icon: FileText, questions: 4, color: "text-orange-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Trophy className="w-8 h-8 text-yellow-500" />
          TOPIK Preparation
        </h2>
        <p className="text-muted-foreground">
          Test of Proficiency in Korean - Mock tests and resources (Coming Soon)
        </p>
      </div>

      {/* TOPIK Levels */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">TOPIK Levels</h3>
        <div className="space-y-3">
          {levels.map((item, index) => (
            <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
              <div className={`w-3 h-3 rounded-full ${item.color}`} />
              <div className="flex-1">
                <p className="font-semibold">{item.level}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Study Plan
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Mock Test Sections */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Mock Test Sections</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {sections.map((section, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <section.icon className={`w-6 h-6 ${section.color}`} />
                <h4 className="font-semibold">{section.title}</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {section.questions} questions
              </p>
              <Button variant="outline" className="w-full" size="sm" disabled>
                Practice
              </Button>
            </Card>
          ))}
        </div>
      </Card>

      {/* Full Mock Tests */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Full Mock Tests</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((test) => (
            <div key={test} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold">TOPIK II Mock Test #{test}</h4>
                  <p className="text-sm text-muted-foreground">
                    100 questions • 180 minutes • AI-graded
                  </p>
                </div>
                <Badge variant="secondary">Not Started</Badge>
              </div>
              <Button className="w-full" disabled>
                <Trophy className="w-4 h-4 mr-2" />
                Start Mock Test (Coming Soon)
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Resources */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Study Resources</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Grammar patterns for each level</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Essential vocabulary lists</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Writing templates and examples</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Past exam analysis with AI feedback</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TopikPrep;
