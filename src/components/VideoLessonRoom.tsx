import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Circle, Calendar, Clock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { toast } from "sonner";
import { AIAssistancePanel } from "./video-lesson/AIAssistancePanel";
import { LessonChat } from "./video-lesson/LessonChat";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format, addDays, getDay } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

interface VideoLessonRoomProps {
  userRole: 'student' | 'teacher';
}

export const VideoLessonRoom = ({ userRole }: VideoLessonRoomProps) => {
  const { lessonId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast: toastUI } = useToast();
  const { t } = useLanguage();

  const groupId = searchParams.get('groupId');
  const groupName = searchParams.get('groupName');
  const isGroupLesson = !!groupId;

  const [videoLesson, setVideoLesson] = useState<any>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [liveFeedback, setLiveFeedback] = useState<any[]>([]);
  const [showNextLesson, setShowNextLesson] = useState(false);
  const [nextLessonInfo, setNextLessonInfo] = useState<any>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const realtimeChannelRef = useRef<any>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    initializeVideoLesson();
    
    // Listen for global stop media event (e.g., from sign out)
    const handleStopMedia = () => {
      cleanup();
    };
    
    window.addEventListener('stopAllMedia', handleStopMedia);
    
    // Cleanup when component unmounts or browser closes
    const handleBeforeUnload = () => {
      cleanup();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      cleanup();
      window.removeEventListener('stopAllMedia', handleStopMedia);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [lessonId, groupId]);

  const initializeVideoLesson = async () => {
    try {
      let sessionData: any = {};

      if (isGroupLesson) {
        // For group lessons, use the group ID as the session identifier
        sessionData = {
          id: groupId,
          name: decodeURIComponent(groupName || 'Group Lesson'),
          type: 'group'
        };
      } else {
        // Get individual video lesson data
        const { data: lesson, error } = await supabase
          .from('video_lessons')
          .select('*, lessons(*)')
          .eq('lesson_id', lessonId)
          .single();

        if (error) throw error;
        sessionData = lesson;

        // Update status to ongoing
        await supabase
          .from('video_lessons')
          .update({ 
            status: 'ongoing',
            start_time: new Date().toISOString()
          })
          .eq('id', lesson.id);
      }

      setVideoLesson(sessionData);

      // Start local media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Setup WebRTC peer connection
      setupPeerConnection();

      // Setup realtime channel for AI feedback
      setupRealtimeChannel(isGroupLesson ? `group_${groupId}` : sessionData.id);

      // Auto-start recording for teachers in group lessons
      if (userRole === 'teacher' && isGroupLesson) {
        setTimeout(() => startRecording(), 2000);
      }

      toast.success(isGroupLesson ? t('joinedGroupLesson') : t('lessonStarted'));

    } catch (error) {
      console.error('Error initializing video lesson:', error);
      toastUI({
        title: t('connectionError'),
        description: t('failedToStartLesson'),
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
      // Stop recording if active and wait for upload to complete
      if (isRecording && userRole === 'teacher' && isGroupLesson) {
        toast.info(t('savingRecording'));
        await stopRecording();
        // Give a moment for upload to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      if (!isGroupLesson && videoLesson?.id) {
        // Update lesson status for individual lessons
        await supabase
          .from('video_lessons')
          .update({ 
            status: 'completed',
            end_time: new Date().toISOString()
          })
          .eq('id', videoLesson.id);

        // Try to generate AI summary, but don't block on failure
        try {
          await supabase.functions.invoke('ai-post-lesson-summary', {
            body: {
              videoLessonId: videoLesson.id,
              liveTips: liveFeedback,
              transcriptSnippets: videoLesson.ai_transcript || []
            }
          });
        } catch (aiError) {
          console.error('AI summary generation failed:', aiError);
          // Continue without AI summary
        }
      }

      // For group lessons, fetch next lesson info
      if (isGroupLesson && groupId) {
        const nextLesson = await getNextLessonInfo(groupId);
        if (nextLesson) {
          setNextLessonInfo(nextLesson);
          setShowNextLesson(true);
        } else {
          finishAndNavigate();
        }
      } else {
        finishAndNavigate();
      }

    } catch (error) {
      console.error('Error ending lesson:', error);
      toastUI({
        title: "Error",
        description: "There was an issue ending the lesson.",
        variant: "destructive",
      });
    }
  };

  const getNextLessonInfo = async (currentGroupId: string) => {
    try {
      const { data: group } = await supabase
        .from('groups')
        .select('*')
        .eq('id', currentGroupId)
        .single();

      if (!group) return null;

      const now = new Date();
      const today = getDay(now);
      const groupDays = Array.isArray(group.day_of_week) ? group.day_of_week : [group.day_of_week];
      
      let daysUntilNext = 7;
      let nextDay = -1;
      
      for (const day of groupDays) {
        const diff = (day - today + 7) % 7;
        if (diff < daysUntilNext || (diff === 0 && daysUntilNext === 7)) {
          if (diff === 0) {
            const [hours, minutes] = group.start_time.split(":").map(Number);
            const lessonStart = new Date();
            lessonStart.setHours(hours, minutes, 0, 0);
            if (now > lessonStart) continue;
          }
          daysUntilNext = diff === 0 ? 0 : diff;
          nextDay = day;
        }
      }
      
      if (nextDay === -1) {
        nextDay = Math.min(...groupDays);
        daysUntilNext = (nextDay - today + 7) % 7 || 7;
      }
      
      const nextDate = addDays(now, daysUntilNext);
      
      return {
        groupName: group.name,
        nextDate,
        startTime: group.start_time,
        durationMinutes: group.duration_minutes
      };
    } catch (error) {
      console.error('Error getting next lesson:', error);
      return null;
    }
  };

  const finishAndNavigate = () => {
    cleanup();
    
    toastUI({
      title: isGroupLesson ? t('leftGroupLesson') : t('lessonEnded'),
      description: isGroupLesson ? t('youHaveLeftLesson') : t('thankYouForLesson'),
    });

    navigate(userRole === 'student' ? '/student/groups' : '/teacher/groups');
  };

  const cleanup = () => {
    // Stop recording if active
    if (mediaRecorder && isRecording) {
      try {
        mediaRecorder.stop();
      } catch (e) {
        console.log('MediaRecorder already stopped');
      }
    }

    // Stop all local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped local track:', track.kind, track.label);
      });
      setLocalStream(null);
    }

    // Stop all remote stream tracks
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => {
        track.stop();
      });
      setRemoteStream(null);
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Remove realtime channel
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    // Clear video element sources
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  const startRecording = async () => {
    if (!localStream || isRecording) return;

    try {
      // Clear previous chunks
      recordedChunksRef.current = [];
      
      const options = { mimeType: 'video/webm;codecs=vp9,opus' };
      const recorder = new MediaRecorder(localStream, options);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('Recording chunk received:', event.data.size, 'bytes');
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        console.log('Recording stopped naturally, chunks collected:', recordedChunksRef.current.length);
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        console.log('Recording blob size:', blob.size);
        if (blob.size > 0) {
          await uploadRecording(blob);
        } else {
          console.error('Recording blob is empty!');
          toast.error("Recording failed - no data captured");
        }
      };

      recorder.start(1000); // Collect data every second
      setMediaRecorder(recorder);
      setIsRecording(true);
      
      console.log('Recording started for group:', groupId);
      toast.success(t('recordingStarted'));
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error(t('recordingFailed'));
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorder || !isRecording) {
      console.log('Cannot stop recording - no active recorder');
      return;
    }

    console.log('Stopping recording manually, current chunks:', recordedChunksRef.current.length);

    return new Promise<void>((resolve) => {
      // Override the onstop handler for manual stops
      mediaRecorder.onstop = async () => {
        console.log('Recording stopped manually, total chunks:', recordedChunksRef.current.length);
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        console.log('Final recording blob size:', blob.size);
        
        if (blob.size > 0) {
          await uploadRecording(blob);
        } else {
          console.error('Recording blob is empty after manual stop!');
          toast.error("Recording failed - no data captured");
        }
        
        setIsRecording(false);
        setMediaRecorder(null);
        recordedChunksRef.current = [];
        resolve();
      };

      try {
        // Request final data before stopping
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.requestData();
          // Give a moment for the final chunk to be added
          setTimeout(() => {
            mediaRecorder.stop();
          }, 100);
        } else {
          mediaRecorder.stop();
        }
      } catch (error) {
        console.error('Error stopping recorder:', error);
        resolve();
      }
    });
  };

  const uploadRecording = async (blob: Blob) => {
    if (!isGroupLesson || !groupId) {
      console.log('Not a group lesson or no groupId, skipping upload');
      return;
    }

    try {
      console.log('Starting upload for recording, blob size:', blob.size);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found');
        return;
      }

      const fileName = `${groupId}/${Date.now()}.webm`;
      
      // Upload to storage
      console.log('Uploading to storage:', fileName);
      const { error: uploadError, data: uploadData } = await supabase
        .storage
        .from('lesson-recordings')
        .upload(fileName, blob, {
          contentType: 'video/webm',
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      // Create recording metadata
      const recordingData = {
        group_id: groupId,
        lesson_date: new Date().toISOString().split('T')[0],
        recording_url: fileName,
        created_by: user.id,
        title: `${groupName || 'Group Lesson'} - ${new Date().toLocaleDateString()}`,
        file_size: blob.size
      };
      
      console.log('Creating metadata:', recordingData);
      
      const { error: metadataError, data: metadataData } = await supabase
        .from('lesson_recordings')
        .insert(recordingData)
        .select();

      if (metadataError) {
        console.error('Metadata error:', metadataError);
        throw metadataError;
      }

      console.log('Metadata created successfully:', metadataData);
      toast.success(t('recordingSaved'));
    } catch (error) {
      console.error("Error uploading recording:", error);
      toast.error(t('recordingFailed'));
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

      if (error) {
        // Handle specific error cases
        if (error.message?.includes('402') || error.message?.includes('credits')) {
          toastUI({
            title: "AI Assistant Unavailable",
            description: "AI credits exhausted. Video lesson continues without AI assistance.",
            variant: "destructive",
          });
        } else if (error.message?.includes('429')) {
          toastUI({
            title: "AI Assistant Busy",
            description: "Rate limit reached. Please try again in a moment.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      // Broadcast to all participants
      if (realtimeChannelRef.current && data) {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'ai_feedback',
          payload: { ...data, timestamp: Date.now() }
        });
      }
    } catch (error) {
      console.error('Error requesting AI help:', error);
      toastUI({
        title: "AI Error",
        description: "Unable to get AI assistance at this time.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="h-screen bg-background flex flex-col">
      {/* Video Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 min-h-0">
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
              <div className="text-center">
                <p className="text-muted-foreground mb-2">
                  {isGroupLesson ? `${groupName || t('groupLesson')}` : t(userRole === 'student' ? 'waitingForTeacher' : 'waitingForStudent')}
                </p>
                {isGroupLesson && (
                  <p className="text-sm text-muted-foreground">{t('waitingForParticipants')}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Left Sidebar: Local Video + AI Panel */}
        <div className="space-y-4 flex flex-col min-h-0">
          {/* Local Video (PiP) */}
          <Card className="relative aspect-video overflow-hidden flex-shrink-0">
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
            <div className="flex-1 min-h-0">
              <AIAssistancePanel 
                liveFeedback={liveFeedback}
                onRequestHelp={requestAIHelp}
              />
            </div>
          )}
        </div>

        {/* Right Sidebar: Chat */}
        {isGroupLesson && chatOpen && (
          <div className="flex flex-col min-h-0">
            <LessonChat 
              groupId={groupId!}
              userRole={userRole}
            />
          </div>
        )}
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

          {isGroupLesson && (
            <Button
              variant={chatOpen ? "secondary" : "outline"}
              size="lg"
              onClick={() => setChatOpen(!chatOpen)}
            >
              <MessageSquare className="w-5 h-5" />
            </Button>
          )}

          {userRole === 'teacher' && isGroupLesson && (
            <Button
              variant={isRecording ? "destructive" : "outline"}
              size="lg"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!localStream}
            >
              <Circle className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
            </Button>
          )}

          <Button
            variant="destructive"
            size="lg"
            onClick={endLesson}
          >
            <PhoneOff className="w-5 h-5 mr-2" />
            {t('endLesson')}
          </Button>
        </div>
      </div>
    </div>

    {/* Next Lesson Dialog */}
    <Dialog open={showNextLesson} onOpenChange={(open) => {
      if (!open) {
        finishAndNavigate();
      }
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('lessonComplete')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-muted-foreground">{t('greatJobNextLesson')}</p>
          {nextLessonInfo && (
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-semibold">{nextLessonInfo.groupName}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(nextLessonInfo.nextDate, "EEEE, MMMM d, yyyy")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <span className="text-sm">
                  {nextLessonInfo.startTime} ({nextLessonInfo.durationMinutes} minutes)
                </span>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={finishAndNavigate} className="w-full">
            {t('backToDashboard')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};