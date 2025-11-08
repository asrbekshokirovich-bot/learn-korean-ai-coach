import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Word {
  korean: string;
  romanization: string;
  english: string;
  example: string;
  exampleTranslation: string;
  mastered?: boolean;
}

const VocabularyBuilder = () => {
  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [level, setLevel] = useState("beginner");
  const [category, setCategory] = useState("daily");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const levels = [
    { value: "beginner", label: "Beginner" },
    { value: "intermediate", label: "Intermediate" },
    { value: "advanced", label: "Advanced" },
  ];

  const categories = [
    { value: "daily", label: "Daily Life" },
    { value: "food", label: "Food & Dining" },
    { value: "travel", label: "Travel" },
    { value: "work", label: "Work & Business" },
    { value: "hobbies", label: "Hobbies" },
  ];

  const loadWords = async () => {
    setIsLoading(true);
    setCurrentIndex(0);
    setShowAnswer(false);

    try {
      const { data, error } = await supabase.functions.invoke('vocabulary-builder', {
        body: { action: 'generate', level, category }
      });

      if (error) throw error;
      
      if (data.words && data.words.length > 0) {
        setWords(data.words.map((w: Word) => ({ ...w, mastered: false })));
      } else {
        throw new Error('No words generated');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load vocabulary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const markMastered = (mastered: boolean) => {
    setWords(prev => {
      const updated = [...prev];
      updated[currentIndex] = { ...updated[currentIndex], mastered };
      return updated;
    });
    nextCard();
  };

  const nextCard = () => {
    setShowAnswer(false);
    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const prevCard = () => {
    setShowAnswer(false);
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else {
      setCurrentIndex(words.length - 1);
    }
  };

  const currentWord = words[currentIndex];
  const masteredCount = words.filter(w => w.mastered).length;

  return (
    <div className="space-y-6">
      {words.length === 0 ? (
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
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={loadWords} disabled={isLoading} size="lg" className="w-full">
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Load Vocabulary
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <Badge>{level}</Badge>
              <Badge variant="outline" className="ml-2">{category}</Badge>
            </div>
            <div className="text-sm font-medium">
              {currentIndex + 1} / {words.length}
            </div>
            <div className="text-sm font-medium text-green-600">
              Mastered: {masteredCount} / {words.length}
            </div>
          </div>

          <Card 
            className="p-12 cursor-pointer transition-all hover:shadow-lg"
            onClick={() => setShowAnswer(!showAnswer)}
          >
            <div className="text-center">
              {!showAnswer ? (
                <>
                  <p className="text-6xl font-bold mb-6">{currentWord.korean}</p>
                  <p className="text-2xl text-muted-foreground">{currentWord.romanization}</p>
                  <p className="text-sm text-muted-foreground mt-8">
                    Tap to reveal answer
                  </p>
                </>
              ) : (
                <>
                  <p className="text-4xl font-bold mb-4">{currentWord.korean}</p>
                  <p className="text-xl text-muted-foreground mb-2">{currentWord.romanization}</p>
                  <p className="text-3xl mb-8">{currentWord.english}</p>
                  
                  <div className="border-t pt-6 mt-6">
                    <p className="text-sm text-muted-foreground mb-2">Example:</p>
                    <p className="text-xl mb-2">{currentWord.example}</p>
                    <p className="text-muted-foreground">{currentWord.exampleTranslation}</p>
                  </div>

                  {currentWord.mastered !== undefined && (
                    <Badge 
                      variant={currentWord.mastered ? "default" : "secondary"} 
                      className="mt-6"
                    >
                      {currentWord.mastered ? "Mastered ✓" : "Learning"}
                    </Badge>
                  )}
                </>
              )}
            </div>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" onClick={prevCard}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                onClick={() => markMastered(false)}
                disabled={!showAnswer}
              >
                Need Practice
              </Button>
              <Button 
                onClick={() => markMastered(true)}
                disabled={!showAnswer}
                className="bg-green-600 hover:bg-green-700"
              >
                Mastered!
              </Button>
            </div>
            <Button variant="outline" onClick={nextCard}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex justify-center">
            <Button variant="outline" onClick={() => setWords([])}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Load New Words
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default VocabularyBuilder;
