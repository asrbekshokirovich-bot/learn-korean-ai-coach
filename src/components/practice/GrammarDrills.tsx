import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface Question {
  question: string;
  korean: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const GrammarDrills = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState("beginner");
  const [topic, setTopic] = useState("particles");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const levels = [
    { value: "beginner", label: "Beginner" },
    { value: "intermediate", label: "Intermediate" },
    { value: "advanced", label: "Advanced" },
  ];

  const topics = [
    { value: "particles", label: "Particles (조사)" },
    { value: "verb-conjugation", label: "Verb Conjugation" },
    { value: "honorifics", label: "Honorifics (존댓말)" },
    { value: "sentence-endings", label: "Sentence Endings" },
    { value: "tenses", label: "Tenses" },
  ];

  const startDrill = async () => {
    setIsLoading(true);
    setScore(0);
    setCurrentIndex(0);
    setShowResult(false);
    setSelectedAnswer(null);

    try {
      const { data, error } = await supabase.functions.invoke('grammar-drill', {
        body: { action: 'generate', level, topic }
      });

      if (error) throw error;
      
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
      } else {
        throw new Error('No questions generated');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to generate questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkAnswer = () => {
    if (selectedAnswer === null) return;
    
    const isCorrect = selectedAnswer === questions[currentIndex].correctIndex;
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
    setShowResult(true);
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  const currentQuestion = questions[currentIndex];

  return (
    <div className="space-y-6">
      {questions.length === 0 ? (
        <Card className="p-8">
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Level</label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {levels.map(l => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Topic</label>
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {topics.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={startDrill} disabled={isLoading} size="lg" className="w-full">
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Start Practice
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <Badge>{level}</Badge>
              <Badge variant="outline" className="ml-2">{topic}</Badge>
            </div>
            <div className="text-sm font-medium">
              Question {currentIndex + 1} / {questions.length}
            </div>
            <div className="text-sm font-medium">
              Score: {score} / {questions.length}
            </div>
          </div>

          <Card className="p-6">
            <div className="mb-6">
              <p className="text-lg mb-2">{currentQuestion.question}</p>
              <p className="text-2xl font-bold text-primary">{currentQuestion.korean}</p>
            </div>

            <RadioGroup 
              value={selectedAnswer?.toString()} 
              onValueChange={(value) => setSelectedAnswer(parseInt(value))}
              disabled={showResult}
            >
              {currentQuestion.options.map((option, index) => (
                <div key={index} className={`flex items-center space-x-2 p-3 rounded-lg border ${
                  showResult && index === currentQuestion.correctIndex 
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                    : showResult && index === selectedAnswer 
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : ''
                }`}>
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                  {showResult && index === currentQuestion.correctIndex && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {showResult && index === selectedAnswer && index !== currentQuestion.correctIndex && (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              ))}
            </RadioGroup>

            {showResult && (
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <p className="font-medium mb-2">Explanation:</p>
                <p className="text-sm text-muted-foreground">{currentQuestion.explanation}</p>
              </div>
            )}

            <div className="mt-6 flex gap-2">
              {!showResult ? (
                <Button 
                  onClick={checkAnswer} 
                  disabled={selectedAnswer === null}
                  className="w-full"
                >
                  Check Answer
                </Button>
              ) : (
                <>
                  {currentIndex < questions.length - 1 ? (
                    <Button onClick={nextQuestion} className="w-full">
                      Next Question
                    </Button>
                  ) : (
                    <div className="w-full text-center p-4 bg-primary/10 rounded-lg">
                      <p className="text-xl font-bold">Quiz Complete!</p>
                      <p className="text-muted-foreground mt-2">
                        Final Score: {score} / {questions.length} ({Math.round((score/questions.length) * 100)}%)
                      </p>
                      <Button onClick={() => setQuestions([])} className="mt-4">
                        New Quiz
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default GrammarDrills;
