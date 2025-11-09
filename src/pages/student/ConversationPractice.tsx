import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Mic, Square, Loader2, TrendingUp, BookOpen, MessageSquare, Link as LinkIcon } from "lucide-react";
import { format } from "date-fns";
import LinkConversationDialog from "@/components/LinkConversationDialog";

const ConversationPractice = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [currentRecording, setCurrentRecording] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [transcription, setTranscription] = useState("");
  const recognitionRef = useRef<any>(null);
  const hasProcessedRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    loadRecordings();
  }, []);

  const loadRecordings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("conversation_recordings")
      .select(`
        *,
        conversation_analysis(*)
      `)
      .eq("student_id", user.id)
      .order("recording_date", { ascending: false });

    setRecordings(data || []);
  };

  const startRecording = async () => {
    try {
      // Check if browser supports Speech Recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        toast({
          title: "Not supported",
          description: "Speech recognition is not supported in your browser. Please use Chrome.",
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to record",
          variant: "destructive",
        });
        return;
      }

      // Reset processed flag for this new session
      hasProcessedRef.current = false;

      // Create a new recording entry
      const { data: recording, error } = await supabase
        .from("conversation_recordings")
        .insert({
          student_id: user.id,
          recording_date: new Date().toISOString().split('T')[0],
          status: "recording",
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentRecording(recording);
      setTranscription("");
      // Show the new 'recording' entry immediately in history
      loadRecordings();

      // Initialize speech recognition
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ko-KR'; // Korean language

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          setTranscription(prev => prev + finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          toast({
            title: "Recognition error",
            description: "There was an error with speech recognition",
            variant: "destructive",
          });
        }
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        // Auto-process if recording stopped due to silence/end
        if (!hasProcessedRef.current && currentRecording) {
          processRecording();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);

      toast({
        title: "Recording started",
        description: "Your conversation is being recorded",
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to start recording";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      // Process the recording after stopping (once)
      setTimeout(() => {
        if (!hasProcessedRef.current) processRecording();
      }, 50);
    }
  };

  const processRecording = async () => {
    if (!currentRecording || hasProcessedRef.current) return;
    hasProcessedRef.current = true;

    setIsProcessing(true);

    try {
      // Update recording with transcription from browser's Speech Recognition
      const { error: updateError } = await supabase
        .from("conversation_recordings")
        .update({
          transcription: transcription,
          status: "processing",
        })
        .eq("id", currentRecording.id);

      if (updateError) throw updateError;

      // Analyze the conversation using Lovable AI
      const { error: analysisError } = await supabase.functions.invoke(
        "analyze-conversation",
        { body: { recordingId: currentRecording.id } }
      );

      if (analysisError) throw analysisError;

      toast({
        title: "Analysis complete!",
        description: "Your conversation has been analyzed",
      });

      loadRecordings();
      setCurrentRecording(null);
      setTranscription("");
    } catch (error) {
      console.error("Error processing recording:", error);
      toast({
        title: "Processing failed",
        description: "Failed to analyze your recording",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const shareWithTeacher = async (analysisId: string) => {
    const { error } = await supabase
      .from("conversation_analysis")
      .update({ shared_with_teacher: true })
      .eq("id", analysisId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to share with teacher",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Shared!",
        description: "Your teacher can now see this analysis",
      });
      loadRecordings();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Daily Conversation Practice</h2>
        <p className="text-muted-foreground">
          Record your daily Korean conversations and get AI-powered analysis
        </p>
      </div>

      {/* Recording Control */}
      <Card className="p-8 text-center">
        {isProcessing ? (
          <div className="space-y-4">
            <Loader2 className="w-16 h-16 mx-auto animate-spin text-primary" />
            <p className="text-lg font-medium">Processing your recording...</p>
            <p className="text-sm text-muted-foreground">This may take a few moments</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-center">
              {isRecording ? (
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={stopRecording}
                  className="h-24 w-24 rounded-full"
                >
                  <Square className="w-8 h-8" />
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={startRecording}
                  className="h-24 w-24 rounded-full bg-red-500 hover:bg-red-600"
                >
                  <Mic className="w-8 h-8" />
                </Button>
              )}
            </div>
            <div>
              {isRecording ? (
                <>
                  <p className="text-xl font-bold text-red-500">Recording...</p>
                  <p className="text-sm text-muted-foreground">
                    Tap the button to stop recording
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xl font-bold">Ready to Record</p>
                  <p className="text-sm text-muted-foreground">
                    Tap the microphone to start recording your conversations
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Recordings History */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Your Recordings</h3>
        {recordings.length === 0 ? (
          <Card className="p-8 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No recordings yet</p>
          </Card>
        ) : (
          recordings.map((recording) => (
            <Card key={recording.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-semibold">{format(new Date(recording.recording_date), "MMMM dd, yyyy")}</p>
                  <Badge variant={recording.status === "completed" ? "default" : "secondary"}>
                    {recording.status}
                  </Badge>
                </div>
                {recording.conversation_analysis && recording.conversation_analysis[0] && (
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      <span className="font-semibold">
                        {recording.conversation_analysis[0].confidence_score}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Confidence</p>
                  </div>
                )}
              </div>

              {recording.conversation_analysis && recording.conversation_analysis[0] && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Struggle Areas:</p>
                    <div className="flex flex-wrap gap-2">
                      {recording.conversation_analysis[0].struggle_areas.map((area: string, i: number) => (
                        <Badge key={i} variant="outline">{area}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">AI Recommendations:</p>
                    <p className="text-sm text-muted-foreground">
                      {recording.conversation_analysis[0].ai_recommendations}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedConversation(recording.conversation_analysis[0]);
                        setLinkDialogOpen(true);
                      }}
                    >
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Link to Lesson
                    </Button>
                    {!recording.conversation_analysis[0].shared_with_teacher && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => shareWithTeacher(recording.conversation_analysis[0].id)}
                      >
                        <BookOpen className="w-4 h-4 mr-2" />
                        Share with Teacher
                      </Button>
                    )}
                    {recording.conversation_analysis[0].shared_with_teacher && (
                      <Badge variant="secondary">Shared with Teacher</Badge>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {selectedConversation && (
        <LinkConversationDialog
          open={linkDialogOpen}
          onOpenChange={setLinkDialogOpen}
          conversationAnalysisId={selectedConversation.id}
          conversationDate={selectedConversation.analysis_date}
          onSuccess={loadRecordings}
        />
      )}
    </div>
  );
};

export default ConversationPractice;
