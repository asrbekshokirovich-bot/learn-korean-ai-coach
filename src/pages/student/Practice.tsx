import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Mic, MessageSquare, BookOpen } from "lucide-react";

const Practice = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">AI Practice</h2>
        <p className="text-muted-foreground">
          Practice Korean with AI-powered tools (Coming Soon)
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">AI Conversation</h3>
              <p className="text-sm text-muted-foreground">Practice real-time conversation</p>
            </div>
          </div>
          <p className="text-muted-foreground mb-4">
            Chat with AI personas in various scenarios. Get instant feedback on grammar and vocabulary.
          </p>
          <Button className="w-full" disabled>
            <Brain className="w-4 h-4 mr-2" />
            Start Conversation (Coming Soon)
          </Button>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Mic className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Pronunciation Practice</h3>
              <p className="text-sm text-muted-foreground">Perfect your accent</p>
            </div>
          </div>
          <p className="text-muted-foreground mb-4">
            AI-powered speech recognition analyzes your pronunciation and provides detailed feedback.
          </p>
          <Button className="w-full" variant="outline" disabled>
            <Mic className="w-4 h-4 mr-2" />
            Start Practice (Coming Soon)
          </Button>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Grammar Drills</h3>
              <p className="text-sm text-muted-foreground">Master Korean grammar</p>
            </div>
          </div>
          <p className="text-muted-foreground mb-4">
            AI-generated exercises tailored to your level. Practice particles, verb conjugations, and more.
          </p>
          <Button className="w-full" variant="outline" disabled>
            <BookOpen className="w-4 h-4 mr-2" />
            Start Drills (Coming Soon)
          </Button>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <Brain className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Vocabulary Builder</h3>
              <p className="text-sm text-muted-foreground">Expand your word bank</p>
            </div>
          </div>
          <p className="text-muted-foreground mb-4">
            Spaced repetition flashcards powered by AI. Learn words that matter for your goals.
          </p>
          <Button className="w-full" variant="outline" disabled>
            <Brain className="w-4 h-4 mr-2" />
            Start Learning (Coming Soon)
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Practice;
