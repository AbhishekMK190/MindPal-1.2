import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff,
  Clock,
  Settings,
  User,
  Wifi,
  WifiOff,
  Shield,
  RefreshCw,
  FileText,
  Star,
  Maximize,
  Minimize,
  MessageSquare,
  Send,
  X
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSettings } from '../../hooks/useSettings';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useTavusVideo } from '../../hooks/useTavusVideo';

import { useVideoReports } from '../../hooks/useVideoReports';
import { VideoReportModal } from './VideoReportModal';
import toast from 'react-hot-toast';

import Modal from 'react-modal';

export function VideoConsultation() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { isOnline, isConnectedToSupabase } = useNetworkStatus();
  const {
    isSessionActive,
    sessionData,
    sessionDuration,
    startSession,
    endSession,
    isLoading,
    error: tavusError,
    formatDuration
  } = useTavusVideo();
  const {
    reports,
    loading: reportsLoading,
    generatingReport,
    generateReport,
    loadReports,
    exportReport,
    shareReport
  } = useVideoReports();

  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPersonality, setSelectedPersonality] = useState(settings.ai_personality);
  const [showReports, setShowReports] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenChat, setShowFullscreenChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{id: string, type: 'user' | 'ai', content: string, timestamp: Date}>>([]);
  const [chatInput, setChatInput] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mediaPermissionError, setMediaPermissionError] = useState<string | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  const fullscreenRef = useRef<HTMLDivElement>(null);

  const [requestingMediaAccess, setRequestingMediaAccess] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);

  const maxSessionTime = 900; // 15 minutes for all users
  
  // Calculate time remaining based on session start time only
  const getElapsedTime = () => {
    if (!sessionStartTime || !isSessionActive) return 0;
    const now = new Date();
    return Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);
  };

  const timeRemaining = Math.max(0, maxSessionTime - getElapsedTime());

  // Load session start time and streak data from localStorage on component mount
  useEffect(() => {
    if (user) {
      // Load session start time
      const savedStartTime = localStorage.getItem(`sessionStartTime_${user.id}`);
      if (savedStartTime) {
        const startTime = new Date(savedStartTime);
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        
        // If session is still within time limit, restore it
        if (elapsed < maxSessionTime) {
          setSessionStartTime(startTime);
        } else {
          // Clear expired session
          localStorage.removeItem(`sessionStartTime_${user.id}`);
        }
      }

      // Load streak data
      const savedStreak = localStorage.getItem(`videoStreak_${user.id}`);
      const savedLongestStreak = localStorage.getItem(`longestVideoStreak_${user.id}`);
      
      if (savedStreak) {
        setCurrentStreak(parseInt(savedStreak));
      }
      if (savedLongestStreak) {
        setLongestStreak(parseInt(savedLongestStreak));
      }
    }
  }, [user, maxSessionTime]);

  // Save session start time to localStorage when session starts
  const saveSessionStartTime = (startTime: Date) => {
    if (user) {
      localStorage.setItem(`sessionStartTime_${user.id}`, startTime.toISOString());
    }
  };


  // Clear session start time from localStorage when session ends
  const clearSessionStartTime = () => {
    if (user) {
      localStorage.removeItem(`sessionStartTime_${user.id}`);
    }
  };

  // Update streak when session ends
  const updateStreak = () => {
    if (!user) return;

    const today = new Date().toDateString();
    const lastSessionDate = localStorage.getItem(`lastVideoSession_${user.id}`);
    
    if (lastSessionDate !== today) {
      // Check if yesterday was the last session (for consecutive streak)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toDateString();
      
      if (lastSessionDate === yesterdayString) {
        // Consecutive day - increment streak
        const newStreak = currentStreak + 1;
        setCurrentStreak(newStreak);
        localStorage.setItem(`videoStreak_${user.id}`, newStreak.toString());
        
        // Update longest streak if needed
        if (newStreak > longestStreak) {
          setLongestStreak(newStreak);
          localStorage.setItem(`longestVideoStreak_${user.id}`, newStreak.toString());
        }
        
        // Show streak notification
        if (newStreak === 1) {
          // First day streak
        } else if (newStreak === 7) {
          // 7-day milestone
        } else if (newStreak % 7 === 0) {
          // Weekly milestone
        } else {
          // Regular streak update
        }
      } else if (lastSessionDate && lastSessionDate !== yesterdayString) {
        // Break in streak - reset to 1
        setCurrentStreak(1);
        localStorage.setItem(`videoStreak_${user.id}`, '1');
        // New streak started
      } else {
        // First session ever
        setCurrentStreak(1);
        localStorage.setItem(`videoStreak_${user.id}`, '1');
        localStorage.setItem(`longestVideoStreak_${user.id}`, '1');
        setLongestStreak(1);
        // First session
      }
      
      // Update last session date
      localStorage.setItem(`lastVideoSession_${user.id}`, today);
    }
  };

  // Default replica ID - this should be configured based on personality
  const getReplicaId = (personality: string) => {
    // These would be actual Tavus replica IDs configured for different personalities
    const replicaMap: Record<string, string> = {
      supportive: 'r89d84ea6160',
      professional: 'r89d84ea6160',
      friendly: 'r665388ec672',
      motivational: 'r665388ec672',
    };
    return replicaMap[personality] || replicaMap.supportive;
  };

  // Load reports on component mount
  useEffect(() => {
    if (user && isConnectedToSupabase) {
      loadReports();
    }
  }, [user, isConnectedToSupabase, loadReports]);

  // Initialize local video stream
  const initializeLocalVideo = async () => {
    // Don't initialize if session is active or stream already exists
    if (isSessionActive || localStream) {
      return;
    }

    try {
      setRequestingMediaAccess(true);
      
      // First check if media devices are available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Media devices not supported in this browser');
      }

      // Check permissions first (if supported)
      if (navigator.permissions) {
        try {
          const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });
          if (permissions.state === 'denied') {
            throw new Error('Camera permission denied');
          }

          const audioPermissions = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (audioPermissions.state === 'denied') {
            throw new Error('Microphone permission denied');
          }
        } catch (permError) {
          console.log('Permission query not supported, proceeding with getUserMedia');
        }
      }

      // Request media access with specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      setLocalStream(stream);
      setMediaPermissionError(null);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure video plays
        videoRef.current.play().catch(console.error);
      }

      // Set initial states based on actual track availability
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      
      setIsVideoEnabled(videoTrack?.enabled ?? true);
      setIsAudioEnabled(audioTrack?.enabled ?? true);

      console.log('Media stream initialized successfully');
    } catch (error: any) {
      console.error('Error accessing media devices:', error);
      
      // Handle different types of permission errors
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setMediaPermissionError('Camera and microphone access denied. Please allow permissions to use video consultation.');
        setShowPermissionModal(true);
      } else if (error.name === 'NotFoundError') {
        setMediaPermissionError('No camera or microphone found. Please connect a camera and microphone to use video consultation.');
      } else if (error.name === 'NotReadableError') {
        setMediaPermissionError('Camera or microphone is already in use by another application.');
      } else if (error.name === 'OverconstrainedError') {
        setMediaPermissionError('Camera or microphone specifications not met. Please try a different device.');
      } else {
        setMediaPermissionError('Browser does not support media devices or access was denied.');
      }
    } finally {
      setRequestingMediaAccess(false);
    }
  };

  // Cleanup local stream
  const cleanupLocalStream = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped ${track.kind} track`);
      });
      setLocalStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  useEffect(() => {
    // Only initialize when not in session and no existing stream
    if (!isSessionActive && !localStream && !mediaPermissionError) {
      initializeLocalVideo();
    }

    // Cleanup on unmount
    return () => {
      cleanupLocalStream();
    };
  }, [isSessionActive, mediaPermissionError]); // Added mediaPermissionError to dependencies

  const handleStartSession = async () => {
    if (!isOnline) {
      return;
    }

    if (!isConnectedToSupabase) {
      return;
    }

    if (mediaPermissionError) {
      setShowPermissionModal(true);
      return;
    }

    // Additional check to prevent starting session when already active
    if (isSessionActive) {
      toast.error('A video session is already active. Please end the current session first.');
      return;
    }

    try {
      // Clean up local stream before starting session
      cleanupLocalStream();
      
      const replicaId = getReplicaId(selectedPersonality);
      const success = await startSession(replicaId, maxSessionTime);
      
      if (success) {

        setSessionStartTime(new Date());
        setChatMessages([{
          id: Date.now().toString(),
          type: 'ai',
          content: 'Hello! I\'m your AI companion. How are you feeling today?',
          timestamp: new Date()
        }]);
        toast.success('Video consultation started!');

        const startTime = new Date();
        setSessionStartTime(startTime);
        saveSessionStartTime(startTime);

      }
    } catch (error) {
      console.error('Failed to start session:', error);
      // Re-initialize local video if session failed to start
      initializeLocalVideo();
    }
  };

  const handleEndSession = async () => {
    try {
      await endSession();
      

      // Generate session report
      if (sessionData && sessionStartTime) {
        const reportData = {
          sessionId: sessionData.session_id,
          duration: sessionDuration,
          conversationTranscript: chatMessages.map(m => `${m.type}: ${m.content}`).join('\n'),
          userFeedback: {
            satisfaction: 4, // Mock data - would come from user input
            helpfulness: 4,
            clarity: 4
          }
        };
        
        await generateReport(reportData);
      }
      
      setSessionStartTime(null);
      setChatMessages([]);
      setIsFullscreen(false);
      setShowFullscreenChat(false);
      toast.success('Video consultation ended');

      setSessionStartTime(null);
      clearSessionStartTime();
      
      // Re-initialize local video after session ends
      setTimeout(() => {
        initializeLocalVideo();
      }, 1000); // Small delay to ensure session cleanup
      updateStreak();
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleFullscreen = async () => {
    if (!fullscreenRef.current) return;

    try {
      if (!isFullscreen) {
        if (fullscreenRef.current.requestFullscreen) {
          await fullscreenRef.current.requestFullscreen();
        } else if ((fullscreenRef.current as any).webkitRequestFullscreen) {
          await (fullscreenRef.current as any).webkitRequestFullscreen();
        } else if ((fullscreenRef.current as any).msRequestFullscreen) {
          await (fullscreenRef.current as any).msRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
        setIsFullscreen(false);
        setShowFullscreenChat(false);
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
      toast.error('Failed to toggle fullscreen');
    }
  };

  const sendChatMessage = () => {
    if (!chatInput.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: chatInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');

    // Simulate AI response (in production, this would integrate with your AI service)
    setTimeout(() => {
      const aiResponse = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: 'Thank you for sharing that with me. I understand how you\'re feeling. Can you tell me more about what\'s been on your mind lately?',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const retryMediaAccess = async () => {
    setMediaPermissionError(null);
    setShowPermissionModal(false);
    
    // Clean up existing stream first
    cleanupLocalStream();
    
    // Wait a bit before retrying
    setTimeout(async () => {
      try {
        // Check if we can access permissions
        if (navigator.permissions) {
          try {
            await navigator.permissions.query({ name: 'camera' as PermissionName });
            await navigator.permissions.query({ name: 'microphone' as PermissionName });
          } catch (permError) {
            console.log('Permission query not supported, proceeding with getUserMedia');
          }
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        setLocalStream(stream);
        setMediaPermissionError(null);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }

        // Set initial states
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        
        setIsVideoEnabled(videoTrack?.enabled ?? true);
        setIsAudioEnabled(audioTrack?.enabled ?? true);

      } catch (error: any) {
        console.error('Error accessing media devices:', error);
        setMediaPermissionError('Unable to access camera and microphone. Please check your device settings.');
      }
    }, 500);
  };

  const personalities = [
    { id: 'supportive', name: 'Supportive & Caring', description: 'Empathetic and understanding' },
    { id: 'professional', name: 'Professional', description: 'Clinical and structured approach' },
    { id: 'friendly', name: 'Friendly & Casual', description: 'Warm and conversational' },
    { id: 'motivational', name: 'Motivational', description: 'Inspiring and encouraging' },
  ];


  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(document.fullscreenElement || 
        (document as any).webkitFullscreenElement || 
        (document as any).msFullscreenElement);
      setIsFullscreen(isCurrentlyFullscreen);
      if (!isCurrentlyFullscreen) {
        setShowFullscreenChat(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Auto-end session when time limit is reached
  useEffect(() => {
    if (isSessionActive && sessionStartTime && timeRemaining <= 0) {
      handleEndSession();
    }
  }, [timeRemaining, isSessionActive, sessionStartTime]);

  // Real-time timer update
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isSessionActive && sessionStartTime) {
      interval = setInterval(() => {
        // Force re-render to update timer display
        // The timeRemaining calculation will automatically update
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isSessionActive, sessionStartTime]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          Face-to-Face AI Consultation
        </h1>
        <p className="text-gray-300">
          Have a personal video conversation with your AI mental health companion
        </p>
        
        {/* Streak Display */}
        {currentStreak > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 inline-flex items-center space-x-4 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-full"
          >
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🔥</span>
              <span className="font-semibold">{currentStreak} day streak</span>
            </div>
            {longestStreak > currentStreak && (
              <div className="flex items-center space-x-1 text-orange-100">
                <span className="text-sm">Best: {longestStreak} days</span>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => setShowReports(!showReports)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors duration-200 flex items-center space-x-2"
        >
          <FileText className="h-4 w-4" />
          <span>Session Reports</span>
        </button>
      </div>

      {/* Session Reports */}
      <AnimatePresence>
        {showReports && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <span>Previous Session Reports</span>
            </h3>
            
            {reportsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : reports.length > 0 ? (
              <div className="space-y-3">
                {reports.slice(0, 5).map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 cursor-pointer"
                    onClick={() => {
                      setSelectedReport(report);
                      setShowReportModal(true);
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                        <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          Session Report - {new Date(report.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-400">
                          Duration: {Math.floor(report.session_duration / 60)}m • Quality: {report.conversation_quality}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < (report.conversation_quality === 'excellent' ? 5 : 
                                   report.conversation_quality === 'good' ? 4 : 
                                   report.conversation_quality === 'fair' ? 3 : 2)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p>No session reports yet. Complete a video consultation to generate your first report!</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connection Status */}
      {(!isOnline || !isConnectedToSupabase) && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
        >
          <div className="flex items-center space-x-3">
            <WifiOff className="h-5 w-5 text-red-600 dark:text-red-400" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-300">Connection Required</p>
              <p className="text-sm text-red-700 dark:text-red-400">
                Video consultation requires a stable internet connection
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Media Permission Error */}
      {mediaPermissionError && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4"
        >
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-1" />
            <div className="flex-1">
              <p className="font-medium text-orange-800 dark:text-orange-300">Camera & Microphone Access Required</p>
              <p className="text-sm text-orange-700 dark:text-orange-400 mb-3">
                {mediaPermissionError}
              </p>
              <button
                onClick={retryMediaAccess}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Video Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Video Area */}
        <div className="lg:col-span-2">
          <motion.div
            ref={fullscreenRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-black rounded-2xl overflow-hidden aspect-video relative ${
              isFullscreen ? 'fixed inset-0 z-50 rounded-none aspect-auto' : ''
            }`}
          >
            {/* AI Video Stream */}
            {isSessionActive && sessionData?.session_url ? (
              <iframe
                src={sessionData.session_url}
                className="w-full h-full"
                allow="camera; microphone; fullscreen"
                title="AI Video Consultation"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-blue-900">
                <div className="text-center text-white">
                  <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">AI Companion Ready</p>
                  <p className="text-sm opacity-75">Start a session to begin video consultation</p>
                </div>
              </div>
            )}

            {/* Local Video Preview */}

            {!isFullscreen && (
              <div className="absolute bottom-4 right-4 w-32 h-24 bg-gray-900 rounded-lg overflow-hidden border-2 border-white/20">
                {mediaPermissionError ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800">
                    <Shield className="h-6 w-6 text-gray-400" />
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
                    />
                    {!isVideoEnabled && (
                      <div className="w-full h-full flex items-center justify-center bg-gray-800">
                        <VideoOff className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Fullscreen Chat Panel */}
            {isFullscreen && (
              <AnimatePresence>
                {showFullscreenChat && (
                  <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    className="absolute top-0 right-0 w-96 h-full bg-black/90 backdrop-blur-xl border-l border-white/20 flex flex-col"
                  >
                    {/* Chat Header */}
                    <div className="p-4 border-b border-white/20 flex items-center justify-between">
                      <h3 className="text-white font-semibold">Session Chat</h3>
                      <button
                        onClick={() => setShowFullscreenChat(false)}
                        className="text-white/60 hover:text-white transition-colors duration-200"
                      >
                        <X className="h-5 w-5" />
                      </button>

            <div className="absolute bottom-4 right-4 w-32 h-24 bg-gray-900 rounded-lg overflow-hidden border-2 border-white/20">
              {mediaPermissionError ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                  <Shield className="h-6 w-6 text-gray-400" />
                </div>
              ) : requestingMediaAccess ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
                  />
                  {!isVideoEnabled && (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                      <VideoOff className="h-6 w-6 text-gray-400" />

                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs px-4 py-2 rounded-lg ${
                              message.type === 'user'
                                ? 'bg-purple-600 text-white'
                                : 'bg-white/10 text-white border border-white/20'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Chat Input */}
                    <div className="p-4 border-t border-white/20">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                          placeholder="Type your message..."
                          className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                          onClick={sendChatMessage}
                          className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg transition-colors duration-200"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* Fullscreen Controls */}
            {isFullscreen && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-black/50 backdrop-blur-sm rounded-full px-6 py-3">
                <button
                  onClick={toggleVideo}
                  className={`p-3 rounded-full transition-all duration-200 ${
                    isVideoEnabled
                      ? 'bg-gray-700 text-white hover:bg-gray-600'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </button>

                <button
                  onClick={toggleAudio}
                  className={`p-3 rounded-full transition-all duration-200 ${
                    isAudioEnabled
                      ? 'bg-gray-700 text-white hover:bg-gray-600'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </button>

                <button
                  onClick={() => setShowFullscreenChat(!showFullscreenChat)}
                  className={`p-3 rounded-full transition-all duration-200 ${
                    showFullscreenChat
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
                >
                  <MessageSquare className="h-5 w-5" />
                </button>

                <button
                  onClick={handleEndSession}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full transition-all duration-200 flex items-center space-x-2"
                >
                  <PhoneOff className="h-5 w-5" />
                  <span>End Session</span>
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="p-3 rounded-full bg-gray-700 text-white hover:bg-gray-600 transition-all duration-200"
                >
                  <Minimize className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* Session Timer */}
            {isSessionActive && (
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white px-3 py-2 rounded-lg flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span className={`font-mono ${timeRemaining <= 120 ? 'text-red-400' : ''}`}>
                  {formatDuration(timeRemaining)}
                </span>
                {timeRemaining <= 120 && timeRemaining > 0 && (
                  <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                )}
              </div>
            )}

            {/* Connection Status Indicator */}
            <div className="absolute top-4 right-4 flex items-center space-x-2">
              {isOnline ? (
                <div className="bg-green-500 w-3 h-3 rounded-full animate-pulse"></div>
              ) : (
                <div className="bg-red-500 w-3 h-3 rounded-full"></div>
              )}
            </div>

            {/* Report Generation Indicator */}
            {generatingReport && (
              <div className="absolute bottom-4 left-4 bg-blue-600/90 backdrop-blur-sm text-white px-3 py-2 rounded-lg flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                <span className="text-sm">Generating report...</span>
              </div>
            )}
          </motion.div>

          {/* Controls */}
          {!isFullscreen && (
            <div className="flex items-center justify-center space-x-4 mt-6">
              <button
                onClick={toggleVideo}
                disabled={!!mediaPermissionError}
                className={`p-3 rounded-full transition-all duration-200 ${
                  mediaPermissionError
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : isVideoEnabled
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
                title={mediaPermissionError ? 'Camera access required' : isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
              >
                {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </button>

              <button
                onClick={toggleAudio}
                disabled={!!mediaPermissionError}
                className={`p-3 rounded-full transition-all duration-200 ${
                  mediaPermissionError
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : isAudioEnabled
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
                title={mediaPermissionError ? 'Microphone access required' : isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
              >
                {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </button>

              {isSessionActive ? (
                <button
                  onClick={handleEndSession}
                  disabled={isLoading}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
                >
                  <PhoneOff className="h-5 w-5" />
                  <span>End Session</span>
                </button>
              ) : (
                <button
                  onClick={handleStartSession}
                  disabled={isLoading || !isOnline || !isConnectedToSupabase || !!mediaPermissionError || isSessionActive}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:shadow-lg text-white px-6 py-3 rounded-full transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Phone className="h-5 w-5" />
                  <span>{isLoading ? 'Starting...' : 'Start Session'}</span>
                </button>
              )}


              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200"
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>

              {isSessionActive && (
                <button
                  onClick={toggleFullscreen}
                  className="p-3 rounded-full bg-purple-600 hover:bg-purple-700 text-white transition-all duration-200"
                  title="Enter fullscreen"
                >
                  <Maximize className="h-5 w-5" />
                </button>
              )}

        {/* Settings Panel */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>AI Personality</span>
            </h3>
            
            <div className="space-y-3">
              {personalities.map((personality) => (
                <label
                  key={personality.id}
                  className={`block p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    selectedPersonality === personality.id
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="personality"
                    value={personality.id}
                    checked={selectedPersonality === personality.id}
                    onChange={(e) => setSelectedPersonality(e.target.value as any)}
                    className="sr-only"
                    disabled={isSessionActive}
                  />
                  <div>
                    <p className="font-medium text-white">{personality.name}</p>
                    <p className="text-sm text-gray-400">{personality.description}</p>
                  </div>
                </label>
              ))}

            </div>
          )}
        </div>


        {/* Settings Panel */}
        {!isFullscreen && (
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>AI Personality</span>
              </h3>
              
              <div className="space-y-3">
                {personalities.map((personality) => (
                  <label
                    key={personality.id}
                    className={`block p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      selectedPersonality === personality.id
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="personality"
                      value={personality.id}
                      checked={selectedPersonality === personality.id}
                      onChange={(e) => setSelectedPersonality(e.target.value as any)}
                      className="sr-only"
                      disabled={isSessionActive}
                    />
                    <div>
                      <p className="font-medium text-white">{personality.name}</p>
                      <p className="text-sm text-gray-400">{personality.description}</p>
                    </div>
                  </label>
                ))}

          {/* Session Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Session Info</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Max Duration:</span>
                <span className="font-medium text-white">
                  15 minutes
                </span>

              </div>
            </motion.div>

            {/* Session Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Session Info</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">

                  <span className="text-gray-400">Max Duration:</span>
                  <span className="font-medium text-white">
                    {Math.floor(maxSessionTime / 60)} minutes
                  </span>
                </div>
                
                {isSessionActive && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Time Left:</span>
                    <span className="font-medium text-white">
                      {formatDuration(timeRemaining)}
                    </span>
                  </div>
                )}

                  <span className="text-gray-400">Time Left:</span>
                  <span className={`font-medium ${timeRemaining <= 120 ? 'text-red-400' : 'text-white'}`}>
                    {formatDuration(timeRemaining)}
                  </span>
                </div>
              )}

              {/* Streak Information */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Current Streak:</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-xl">🔥</span>
                    <span className="font-medium text-white">{currentStreak} days</span>
                  </div>
                </div>
                
                {longestStreak > currentStreak && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Longest Streak:</span>
                    <span className="font-medium text-orange-400">{longestStreak} days</span>
                  </div>
                )}
                
                {currentStreak === 0 && (
                  <div className="text-center py-2">
                    <p className="text-sm text-gray-400">Start your first session to begin your streak!</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>


                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total Reports:</span>
                  <span className="font-medium text-white">
                    {reports.length}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Tips */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800"
            >
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-3">Tips for Better Sessions</h3>
              <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-400">
                <li>• Ensure good lighting on your face</li>
                <li>• Use headphones for better audio quality</li>
                <li>• Find a quiet, private space</li>
                <li>• Speak clearly and at normal pace</li>
                <li>• Be open and honest with the AI</li>
                <li>• Use fullscreen mode for immersive experience</li>
                <li>• Try the chat feature during sessions</li>
              </ul>
            </motion.div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {tavusError && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
        >
          <div className="flex items-center space-x-3">
            <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-300">Session Error</p>
              <p className="text-sm text-red-700 dark:text-red-400">{tavusError}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Video Report Modal */}
      <VideoReportModal
        isOpen={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setSelectedReport(null);
        }}
        report={selectedReport}
        onExport={exportReport}
        onShare={shareReport}
      />

      {/* Permission Modal */}
      <Modal
        isOpen={showPermissionModal}
        onRequestClose={() => setShowPermissionModal(false)}
        className="fixed inset-0 flex items-center justify-center z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 z-40"
        ariaHideApp={false}
      >
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-lg w-full shadow-xl">
          <div className="text-center mb-6">
            <Shield className="h-16 w-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Camera & Microphone Access Required</h2>
            <p className="text-gray-700 dark:text-gray-300">
              To use video consultation, please allow access to your camera and microphone.
            </p>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">How to enable permissions:</h3>
              
              {/* Browser-specific instructions */}
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">Chrome/Edge:</h4>
                  <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-1 ml-2">
                    <li>1. Click the camera/microphone icon in the address bar</li>
                    <li>2. Select "Allow" for both camera and microphone</li>
                    <li>3. If blocked, click "Manage" and enable permissions</li>
                  </ol>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">Firefox:</h4>
                  <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-1 ml-2">
                    <li>1. Click the shield icon in the address bar</li>
                    <li>2. Set "Camera" and "Microphone" to "Allow"</li>
                    <li>3. Refresh the page after changing permissions</li>
                  </ol>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">Safari:</h4>
                  <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-1 ml-2">
                    <li>1. Go to Safari &gt; Preferences &gt; Websites</li>
                    <li>2. Select "Camera" and "Microphone" from the left sidebar</li>
                    <li>3. Set this website to "Allow"</li>
                  </ol>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Note:</strong> If you don't see the permission prompt, try refreshing the page or check if another app is using your camera/microphone.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <button
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center space-x-2"
              onClick={retryMediaAccess}
            >
              <RefreshCw className="h-4 w-4" />
              <span>Try Again</span>
            </button>
            <button
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-semibold"
              onClick={() => setShowPermissionModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}