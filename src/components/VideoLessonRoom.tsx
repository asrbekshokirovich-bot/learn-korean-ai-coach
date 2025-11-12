import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Circle, Calendar, Clock, User, Monitor, MonitorOff } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { toast } from "sonner";
import { AIAssistancePanel } from "./video-lesson/AIAssistancePanel";
import { LessonChat } from "./video-lesson/LessonChat";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format, addDays, getDay } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface VideoLessonRoomProps {
  userRole: 'student' | 'teacher';
}

interface Participant {
  userId: string;
  userName: string;
  userRole: 'student' | 'teacher';
  stream?: MediaStream;
  peerConnection?: RTCPeerConnection;
  profilePicture?: string;
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
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [currentUserProfile, setCurrentUserProfile] = useState<string>('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingCanvas, setRecordingCanvas] = useState<HTMLCanvasElement | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [liveFeedback, setLiveFeedback] = useState<any[]>([]);
  const [showNextLesson, setShowNextLesson] = useState(false);
  const [nextLessonInfo, setNextLessonInfo] = useState<any>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const participantVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const participantsRef = useRef<Map<string, Participant>>(new Map());
  const realtimeChannelRef = useRef<any>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStopTimeoutRef = useRef<number | null>(null);

  const getCurrentVideoTrack = () => {
    if (isScreenSharing && screenShareStream?.getVideoTracks()?.[0]) return screenShareStream.getVideoTracks()[0];
    return localStream?.getVideoTracks()?.[0] || null;
  };

  // Keep ref synced with latest participants and bind streams to video elements
  useEffect(() => {
    participantsRef.current = participants;
    participants.forEach((p, id) => {
      const el = participantVideosRef.current.get(id);
      if (el && p.stream && el.srcObject !== p.stream) {
        el.srcObject = p.stream;
      }
    });

    // Update recording if active (add/remove participant streams)
    if (isRecording && userRole === 'teacher') {
      console.log('Participants changed during recording, updating composite');
      // The recording will automatically pick up new streams on next canvas draw
    }
  }, [participants, isRecording, userRole]);

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
      // Get current user info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');
      
      console.log('Fetching profile for user:', user.id);
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, profile_picture_url')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
      }

      const userName = profile?.full_name || user.email?.split('@')[0] || 'Student';
      const userProfile = profile?.profile_picture_url || '';

      console.log('User profile loaded:', { userName, userProfile });

      setCurrentUserId(user.id);
      setCurrentUserName(userName);
      setCurrentUserProfile(userProfile);

      let sessionData: any = {};

      if (isGroupLesson) {
        sessionData = {
          id: groupId,
          name: decodeURIComponent(groupName || 'Group Lesson'),
          type: 'group'
        };
      } else {
        const { data: lesson, error } = await supabase
          .from('video_lessons')
          .select('*, lessons(*)')
          .eq('lesson_id', lessonId)
          .single();

        if (error) throw error;
        sessionData = lesson;

        await supabase
          .from('video_lessons')
          .update({ 
            status: 'ongoing',
            start_time: new Date().toISOString()
          })
          .eq('id', lesson.id);
      }

      setVideoLesson(sessionData);

      // Start local media with explicit audio settings
      console.log('Requesting media devices...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      });
      
      console.log('Media stream acquired:', {
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length
      });

      // Ensure audio track is enabled
      stream.getAudioTracks().forEach(track => {
        track.enabled = true;
        console.log('Audio track enabled:', track.label);
      });

      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Setup realtime signaling channel with user info
      await setupRealtimeChannel(
        isGroupLesson ? `group_${groupId}` : sessionData.id, 
        user.id,
        userName,
        userProfile
      );

      // Auto-start recording for teachers in group lessons immediately
      if (userRole === 'teacher' && isGroupLesson) {
        console.log('Teacher joined - starting automatic recording');
        setTimeout(() => startRecording(), 1000); // Small delay to ensure everything is initialized
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

  const createPeerConnection = async (remoteUserId: string): Promise<RTCPeerConnection> => {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
    };

    const pc = new RTCPeerConnection(configuration);

    // Add local media tracks with current video selection
    const audioTrack = localStream?.getAudioTracks()?.[0] || null;
    const videoTrack = getCurrentVideoTrack();
    if (audioTrack) {
      pc.addTrack(audioTrack, localStream as MediaStream);
      console.log('Added local audio track');
    }
    if (videoTrack) {
      const srcStream = isScreenSharing && screenShareStream ? screenShareStream : (localStream as MediaStream);
      pc.addTrack(videoTrack, srcStream);
      console.log('Added video track (screenShare:', isScreenSharing, ')');
    } else {
      console.warn('No video track available when creating peer connection');
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('Received remote track from:', remoteUserId, 'kind:', event.track.kind);
      const stream = event.streams[0];
      console.log('Remote stream tracks:', stream.getTracks().map(t => ({
        kind: t.kind,
        label: t.label,
        enabled: t.enabled
      })));

      setParticipants(prev => {
        const updated = new Map(prev);
        const participant = updated.get(remoteUserId);
        if (participant) {
          participant.stream = stream;
          updated.set(remoteUserId, participant);
          console.log('Updated participant stream:', remoteUserId);
        } else {
          console.warn('Received track for unknown participant:', remoteUserId);
        }
        return updated;
      });
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && realtimeChannelRef.current) {
        console.log('Sending ICE candidate to:', remoteUserId);
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            candidate: event.candidate,
            from: currentUserId,
            to: remoteUserId
          }
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState, 'for user:', remoteUserId);
    };

    pc.onnegotiationneeded = async () => {
      try {
        if (!realtimeChannelRef.current) return;
        console.log('Negotiation needed with', remoteUserId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'offer',
          payload: { offer, from: currentUserId, to: remoteUserId }
        });
      } catch (err) {
        console.error('Negotiation failed', err);
      }
    };
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState, 'for user:', remoteUserId);
      if (pc.connectionState === 'failed') {
        console.error('Connection failed for user:', remoteUserId);
      }
    };

    return pc;
  };
  const setupRealtimeChannel = async (
    videoLessonId: string, 
    userId: string, 
    userName: string, 
    userProfile: string
  ) => {
    const channel = supabase
      .channel(`video_lesson_${videoLessonId}`, {
        config: {
          broadcast: { self: true }
        }
      })
      // User joined
      .on('broadcast', { event: 'user-joined' }, async ({ payload }) => {
        if (payload.userId === userId) return; // Ignore self
        
        console.log('User joined:', payload);
        
        setParticipants(prev => {
          const updated = new Map(prev);
          if (!updated.has(payload.userId)) {
            updated.set(payload.userId, {
              userId: payload.userId,
              userName: payload.userName,
              userRole: payload.userRole,
              profilePicture: payload.profilePicture
            });
          }
          return updated;
        });

        // Create offer for new participant
        try {
          const pc = await createPeerConnection(payload.userId);
          const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
          await pc.setLocalDescription(offer);

          setParticipants(prev => {
            const updated = new Map(prev);
            const participant = updated.get(payload.userId);
            if (participant) {
              participant.peerConnection = pc;
              updated.set(payload.userId, participant);
            }
            return updated;
          });

          channel.send({
            type: 'broadcast',
            event: 'offer',
            payload: {
              offer: offer,
              from: userId,
              to: payload.userId
            }
          });
        } catch (error) {
          console.error('Error creating offer:', error);
        }
      })
      // Received offer
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.to !== userId) return;
        
        console.log('Received offer from:', payload.from);
        
        try {
          let pc = participantsRef.current.get(payload.from)?.peerConnection;
          if (!pc) {
            pc = await createPeerConnection(payload.from);
            setParticipants(prev => {
              const updated = new Map(prev);
              const participant = updated.get(payload.from);
              if (participant) {
                participant.peerConnection = pc;
                updated.set(payload.from, participant);
              }
              return updated;
            });
          }

          await pc.setRemoteDescription(payload.offer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          channel.send({
            type: 'broadcast',
            event: 'answer',
            payload: {
              answer: answer,
              from: userId,
              to: payload.from
            }
          });
        } catch (error) {
          console.error('Error handling offer:', error);
        }
      })
      // Received answer
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload.to !== userId) return;
        
        console.log('Received answer from:', payload.from);
        
        try {
          const participant = participantsRef.current.get(payload.from);
          if (participant?.peerConnection) {
            await participant.peerConnection.setRemoteDescription(
              new RTCSessionDescription(payload.answer)
            );
          }
        } catch (error) {
          console.error('Error handling answer:', error);
        }
      })
      // Received ICE candidate
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.to !== userId) return;
        
        try {
          const participant = participantsRef.current.get(payload.from);
          if (participant?.peerConnection) {
            await participant.peerConnection.addIceCandidate(
              new RTCIceCandidate(payload.candidate)
            );
          }
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      })
      // User left
      .on('broadcast', { event: 'user-left' }, ({ payload }) => {
        console.log('User left:', payload.userId);
        
        setParticipants(prev => {
          const updated = new Map(prev);
          const participant = updated.get(payload.userId);
          if (participant) {
            participant.peerConnection?.close();
            participant.stream?.getTracks().forEach(track => track.stop());
            updated.delete(payload.userId);
          }
          return updated;
        });
      })
      // AI feedback
      .on('broadcast', { event: 'ai_feedback' }, (payload) => {
        setLiveFeedback(prev => [...prev, payload.payload]);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime channel subscribed, announcing presence with name:', userName);
          // Announce presence with the passed userName and userProfile
          channel.send({
            type: 'broadcast',
            event: 'user-joined',
            payload: {
              userId: userId,
              userName: userName,
              userRole: userRole,
              profilePicture: userProfile
            }
          });
        }
      });

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

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });

        console.log('Screen share started');
        setScreenShareStream(screenStream);
        setIsScreenSharing(true);

        // Notify all participants about screen share
        if (realtimeChannelRef.current) {
          realtimeChannelRef.current.send({
            type: 'broadcast',
            event: 'screen-share-started',
            payload: {
              userId: currentUserId,
              userName: currentUserName
            }
          });
        }

        // Replace video track in all peer connections
        participants.forEach((participant) => {
          if (participant.peerConnection) {
            const videoSender = participant.peerConnection
              .getSenders()
              .find(sender => sender.track?.kind === 'video');
            
            if (videoSender && screenStream.getVideoTracks()[0]) {
              videoSender.replaceTrack(screenStream.getVideoTracks()[0]);
              console.log('Replaced video track with screen share for:', participant.userId);
            }
          }
        });

        // Listen for screen share stop (user clicks browser stop button)
        screenStream.getVideoTracks()[0].onended = () => {
          stopScreenShare();
        };

        toast.success('Screen sharing started');
      } catch (error) {
        console.error('Error starting screen share:', error);
        toast.error('Failed to start screen sharing');
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (screenShareStream) {
      screenShareStream.getTracks().forEach(track => track.stop());
      setScreenShareStream(null);
    }
    
    setIsScreenSharing(false);

    // Notify participants
    if (realtimeChannelRef.current) {
      realtimeChannelRef.current.send({
        type: 'broadcast',
        event: 'screen-share-stopped',
        payload: {
          userId: currentUserId
        }
      });
    }

    // Replace back to camera video in all peer connections
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      participants.forEach((participant) => {
        if (participant.peerConnection) {
          const videoSender = participant.peerConnection
            .getSenders()
            .find(sender => sender.track?.kind === 'video');
          
          if (videoSender && videoTrack) {
            videoSender.replaceTrack(videoTrack);
            console.log('Replaced screen share with camera for:', participant.userId);
          }
        }
      });
    }

    toast.info('Screen sharing stopped');
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
    // Stop screen sharing if active
    if (isScreenSharing) {
      stopScreenShare();
    }

    // Clear auto-stop timer
    if (recordingStopTimeoutRef.current) {
      clearTimeout(recordingStopTimeoutRef.current);
      recordingStopTimeoutRef.current = null;
    }

    // Announce leaving
    if (realtimeChannelRef.current && currentUserId) {
      realtimeChannelRef.current.send({
        type: 'broadcast',
        event: 'user-left',
        payload: { userId: currentUserId }
      });
    }

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

    // Close all peer connections and stop streams
    participants.forEach((participant) => {
      participant.peerConnection?.close();
      participant.stream?.getTracks().forEach(track => track.stop());
    });
    setParticipants(new Map());

    // Remove realtime channel
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    // Clear video element sources
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  };

  const startRecording = async () => {
    if (!localStream || isRecording) return;

    try {
      console.log('Starting automatic lesson recording...');
      
      // Create canvas for compositing all video streams
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      setRecordingCanvas(canvas);

      // Create audio context for mixing all audio streams
      const audioCtx = new AudioContext();
      setAudioContext(audioCtx);
      
      const audioDestination = audioCtx.createMediaStreamDestination();

      // Add local stream audio
      if (localStream.getAudioTracks().length > 0) {
        const localAudioSource = audioCtx.createMediaStreamSource(localStream);
        localAudioSource.connect(audioDestination);
        console.log('Added local audio to recording');
      }

      // Add all participant audio streams
      participantsRef.current.forEach((participant, id) => {
        if (participant.stream && participant.stream.getAudioTracks().length > 0) {
          try {
            const source = audioCtx.createMediaStreamSource(participant.stream);
            source.connect(audioDestination);
            console.log('Added participant audio to recording:', participant.userName);
          } catch (err) {
            console.error('Error adding participant audio:', err);
          }
        }
      });

      // Create composite video stream by drawing all videos to canvas
      let animationFrameId: number;
      const drawFrame = () => {
        if (!ctx) return;

        // Clear canvas
        ctx.fillStyle = '#1a1f2b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calculate grid layout
        const allStreams: Array<{ stream: MediaStream; name: string }> = [];
        
        // Add local stream
        if (localStream) {
          allStreams.push({ stream: localStream, name: currentUserName });
        }

        // Add all participant streams
        participantsRef.current.forEach((p) => {
          if (p.stream) {
            allStreams.push({ stream: p.stream, name: p.userName });
          }
        });

        const streamCount = allStreams.length;
        if (streamCount === 0) {
          animationFrameId = requestAnimationFrame(drawFrame);
          return;
        }

        const cols = Math.ceil(Math.sqrt(streamCount));
        const rows = Math.ceil(streamCount / cols);
        const cellWidth = canvas.width / cols;
        const cellHeight = canvas.height / rows;

        // Draw each video stream
        allStreams.forEach((item, index) => {
          const col = index % cols;
          const row = Math.floor(index / cols);
          const x = col * cellWidth;
          const y = row * cellHeight;

          // Create temporary video element for drawing
          const videoEl = document.createElement('video');
          videoEl.srcObject = item.stream;
          videoEl.muted = true;
          videoEl.play().catch(err => console.log('Play error:', err));

          // Draw video frame
          try {
            ctx.drawImage(videoEl, x, y, cellWidth, cellHeight);
            
            // Draw name label
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(x + 10, y + cellHeight - 40, cellWidth - 20, 30);
            ctx.fillStyle = '#ffffff';
            ctx.font = '16px Arial';
            ctx.fillText(item.name, x + 20, y + cellHeight - 18);
          } catch (err) {
            // Video not ready yet
          }
        });

        animationFrameId = requestAnimationFrame(drawFrame);
      };

      drawFrame();

      // Combine canvas video stream with mixed audio
      const canvasStream = canvas.captureStream(30); // 30 FPS
      const videoTrack = canvasStream.getVideoTracks()[0];
      const audioTrack = audioDestination.stream.getAudioTracks()[0];

      const recordingStream = new MediaStream([videoTrack, audioTrack]);

      // Clear previous chunks
      recordedChunksRef.current = [];
      
      const options = { 
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 2500000 // 2.5 Mbps for good quality
      };
      const recorder = new MediaRecorder(recordingStream, options);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('Recording chunk received:', event.data.size, 'bytes');
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        console.log('Recording stopped, chunks collected:', recordedChunksRef.current.length);
        
        // Stop animation frame
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }

        // Clean up canvas and audio context
        if (recordingCanvas) {
          recordingCanvas.remove();
          setRecordingCanvas(null);
        }
        if (audioContext) {
          audioContext.close();
          setAudioContext(null);
        }

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
      
      console.log('Automatic recording started for group:', groupId);
      toast.success('Recording started automatically');
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error('Failed to start recording');
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

  // Separate participants by role
  const teacher = Array.from(participants.values()).find(p => p.userRole === 'teacher');
  const students = Array.from(participants.values()).filter(p => p.userRole === 'student');
  const allParticipants = teacher ? [teacher, ...students] : students;

  return (
    <>
      <div className="h-screen bg-background flex flex-col">
      {/* Video Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 min-h-0">
        {/* Main Video Grid - Shows all participants */}
        <div className="lg:col-span-2 relative bg-muted rounded-lg overflow-hidden p-4">
          {allParticipants.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-2">
                  {isGroupLesson ? `${groupName || t('groupLesson')}` : t(userRole === 'student' ? 'waitingForTeacher' : 'waitingForStudent')}
                </p>
                {isGroupLesson && (
                  <p className="text-sm text-muted-foreground">{t('waitingForParticipants')}</p>
                )}
              </div>
            </div>
          ) : (
            <div className={`grid gap-3 h-full ${
              allParticipants.length === 1 ? 'grid-cols-1' :
              allParticipants.length <= 4 ? 'grid-cols-2' :
              allParticipants.length <= 9 ? 'grid-cols-3' : 'grid-cols-4'
            }`}>
              {allParticipants.map((participant) => (
                <Card key={participant.userId} className="relative overflow-hidden bg-card">
                  <video
                    ref={(el) => {
                      if (el && participant.stream) {
                        el.srcObject = participant.stream;
                        el.muted = false;
                        participantVideosRef.current.set(participant.userId, el);
                        el.play().catch((e) => console.log('Autoplay prevented, will play on user interaction', e));
                      }
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {!participant.stream && (
                    <div className="absolute inset-0 bg-muted flex items-center justify-center">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={participant.profilePicture} />
                        <AvatarFallback className="text-2xl">
                          {participant.userName[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={participant.profilePicture} />
                      <AvatarFallback className="text-xs">
                        {participant.userName[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate flex-1">
                      {participant.userName}
                    </span>
                    {participant.userRole === 'teacher' && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                        {t('teacher')}
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Left Sidebar: Local Video + AI Panel */}
        <div className="space-y-4 flex flex-col min-h-0">
          {/* Local Video (You) */}
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
                <Avatar className="h-16 w-16">
                  <AvatarImage src={currentUserProfile} />
                  <AvatarFallback className="text-2xl">
                    {currentUserName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
            <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-lg">
              <Avatar className="h-6 w-6">
                <AvatarImage src={currentUserProfile} />
                <AvatarFallback className="text-xs">
                  {currentUserName[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium truncate flex-1">
                {currentUserName}
              </span>
              {userRole === 'teacher' && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                  {t('teacher')}
                </span>
              )}
            </div>
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

          <Button
            variant={isScreenSharing ? "default" : "outline"}
            size="lg"
            onClick={toggleScreenShare}
            disabled={!localStream}
          >
            {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
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
            <div className="flex items-center gap-2 px-3 py-2 bg-destructive/20 text-destructive rounded-lg border border-destructive/30">
              <Circle className={`w-4 h-4 ${isRecording ? 'animate-pulse' : ''}`} />
              <span className="text-sm font-medium">
                {isRecording ? 'Recording' : 'Recording Stopped'}
              </span>
            </div>
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