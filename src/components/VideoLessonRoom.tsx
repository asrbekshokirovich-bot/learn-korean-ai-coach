import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { AIAssistancePanel } from "./video-lesson/AIAssistancePanel";

interface VideoLessonRoomProps {
  userRole: 'student' | 'teacher';
}

export const VideoLessonRoom = ({ userRole }: VideoLessonRoomProps) => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [videoLesson, setVideoLesson] = useState<any>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [liveFeedback, setLiveFeedback] = useState<any[]>([]);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const realtimeChannelRef = useRef<any>(null);

  useEffect(() => {
    initializeVideoLesson();
    return () => cleanup();
  }, [lessonId]);

  const initializeVideoLesson = async () => {
    try {
      // Get video lesson data
      const { data: lesson, error } = await supabase
        .from('video_lessons')
        .select('*, lessons(*)')
        .eq('lesson_id', lessonId)
        .single();

      if (error) throw error;
      setVideoLesson(lesson);

      // Start local media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Update status to ongoing
      await supabase
        .from('video_lessons')
        .update({ 
          status: 'ongoing',
          start_time: new Date().toISOString()
        })
        .eq('id', lesson.id);

      // Setup WebRTC peer connection
      setupPeerConnection();

      // Setup realtime channel for AI feedback
      setupRealtimeChannel(lesson.id);

      toast({
        title: "Lesson Started",
        description: "Video connection established",
      });

    } catch (error) {
      console.error('Error initializing video lesson:', error);
      toast({
        title: "Connection Error",
        description: "Failed to start video lesson",
        variant: "destructive",
      });
    }
  };

  const setupPeerConnection = () => {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    };

    const pc = new RTCPeerConnection(configuration);
    peerConnectionRef.current = pc;

    // Add local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // ICE candidate handling would go here
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Send candidate through Supabase Realtime
        console.log('ICE candidate:', event.candidate);
      }
    };
  };

  const setupRealtimeChannel = (videoLessonId: string) => {
    const channel = supabase
      .channel(`video_lesson_${videoLessonId}`)
      .on('broadcast', { event: 'ai_feedback' }, (payload) => {
        setLiveFeedback(prev => [...prev, payload.payload]);
      })
      .subscribe();

    realtimeChannelRef.current = channel;
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    }
  };

  const endLesson = async () => {
    try {
      // Update lesson status
      await supabase
        .from('video_lessons')
        .update({ 
          status: 'completed',
          end_time: new Date().toISOString()
        })
        .eq('id', videoLesson.id);

      // Generate AI summary
      await supabase.functions.invoke('ai-post-lesson-summary', {
        body: {
          videoLessonId: videoLesson.id,
          liveTips: liveFeedback,
          transcriptSnippets: videoLesson.ai_transcript || []
        }
      });

      cleanup();
      
      toast({
        title: "Lesson Ended",
        description: "Generating AI summary...",
      });

      navigate(userRole === 'student' ? '/student/lessons' : '/teacher');
    } catch (error) {
      console.error('Error ending lesson:', error);
    }
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }
  };

  const requestAIHelp = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-live-assist', {
        body: {
          audioChunk: "User requested help",
          userLevel: videoLesson?.lessons?.student_id,
          topic: videoLesson?.lessons?.lesson_type
        }
      });

      if (error) throw error;

      // Broadcast to all participants
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'ai_feedback',
          payload: { ...data, timestamp: Date.now() }
        });
      }
    } catch (error) {
      console.error('Error requesting AI help:', error);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Video Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
        {/* Main Video (Remote) */}
        <div className="lg:col-span-2 relative bg-muted rounded-lg overflow-hidden">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {!remoteStream && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-muted-foreground">Waiting for {userRole === 'student' ? 'teacher' : 'student'}...</p>
            </div>
          )}
        </div>

        {/* Sidebar: Local Video + AI Panel */}
        <div className="space-y-4">
          {/* Local Video (PiP) */}
          <Card className="relative aspect-video overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {isVideoOff && (
              <div className="absolute inset-0 bg-muted flex items-center justify-center">
                <VideoOff className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </Card>

          {/* AI Assistance Panel */}
          {aiPanelOpen && (
            <AIAssistancePanel 
              liveFeedback={liveFeedback}
              onRequestHelp={requestAIHelp}
            />
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="border-t bg-card p-4">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="lg"
            onClick={toggleMute}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          
          <Button
            variant={isVideoOff ? "destructive" : "secondary"}
            size="lg"
            onClick={toggleVideo}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => setAiPanelOpen(!aiPanelOpen)}
          >
            <MessageSquare className="w-5 h-5" />
          </Button>

          <Button
            variant="destructive"
            size="lg"
            onClick={endLesson}
          >
            <PhoneOff className="w-5 h-5 mr-2" />
            End Lesson
          </Button>
        </div>
      </div>
    </div>
  );
};