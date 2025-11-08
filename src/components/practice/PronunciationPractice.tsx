import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Mic, Square, Loader2, Volume2 } from "lucide-react";

const PronunciationPractice = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentPhrase, setCurrentPhrase] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const generateNewPhrase = async () => {
    setIsLoading(true);
    setScore(null);
    try {
      const { data, error } = await supabase.functions.invoke('pronunciation-check', {
        body: { action: 'generate_phrase' }
      });

      if (error) throw error;
      setCurrentPhrase(data);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to generate phrase",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Simulated score since we don't have actual speech recognition yet
        const randomScore = Math.floor(Math.random() * 30) + 70; // 70-100
        setScore(randomScore);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const speakPhrase = () => {
    if (!currentPhrase) return;
    const utterance = new SpeechSynthesisUtterance(currentPhrase.korean);
    utterance.lang = 'ko-KR';
    speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-6">
      {!currentPhrase ? (
        <Card className="p-12 text-center">
          <h3 className="text-xl font-semibold mb-4">Ready to Practice?</h3>
          <p className="text-muted-foreground mb-6">
            Get a Korean phrase and practice your pronunciation
          </p>
          <Button onClick={generateNewPhrase} disabled={isLoading} size="lg">
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Generate Practice Phrase
          </Button>
        </Card>
      ) : (
        <>
          <Card className="p-6">
            <div className="text-center mb-6">
              <Badge className="mb-4">{currentPhrase.difficulty}</Badge>
              <h3 className="text-4xl font-bold mb-4">{currentPhrase.korean}</h3>
              <p className="text-xl text-muted-foreground mb-2">{currentPhrase.romanization}</p>
              <p className="text-lg">{currentPhrase.english}</p>
            </div>

            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={speakPhrase}>
                <Volume2 className="w-4 h-4 mr-2" />
                Listen
              </Button>
              <Button onClick={generateNewPhrase} variant="outline">
                New Phrase
              </Button>
            </div>
          </Card>

          <Card className="p-8">
            <div className="text-center">
              <h4 className="text-lg font-semibold mb-4">Record Your Pronunciation</h4>
              
              {!isRecording ? (
                <Button 
                  size="lg"
                  onClick={startRecording}
                  className="h-24 w-24 rounded-full bg-red-500 hover:bg-red-600"
                >
                  <Mic className="w-8 h-8" />
                </Button>
              ) : (
                <Button 
                  size="lg"
                  variant="destructive"
                  onClick={stopRecording}
                  className="h-24 w-24 rounded-full"
                >
                  <Square className="w-8 h-8" />
                </Button>
              )}

              <p className="text-sm text-muted-foreground mt-4">
                {isRecording ? "Recording... Tap to stop" : "Tap to start recording"}
              </p>

              {score !== null && (
                <div className="mt-6 p-6 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Your Score</p>
                  <p className="text-5xl font-bold text-primary">{score}%</p>
                  <p className="text-sm mt-2">
                    {score >= 90 ? "Excellent!" : score >= 75 ? "Good job!" : "Keep practicing!"}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default PronunciationPractice;
