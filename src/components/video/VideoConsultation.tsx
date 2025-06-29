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
  Star
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mediaPermissionError, setMediaPermissionError] = useState<string | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  const maxSessionTime = 3600; // 60 minutes for all users
  const timeRemaining = Math.max(0, maxSessionTime - sessionDuration);

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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      setMediaPermissionError(null);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error: any) {
      console.error('Error accessing media devices:', error);
      
      // Handle different types of permission errors
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setMediaPermissionError('Camera and microphone access denied. Please allow permissions to use video consultation.');
        setShowPermissionModal(true);
      } else if (error.name === 'NotFoundError') {
        setMediaPermissionError('No camera or microphone found. Please connect a camera and microphone to use video consultation.');
        toast.error('No camera or microphone detected');
      } else if (error.name === 'NotReadableError') {
        setMediaPermissionError('Camera or microphone is already in use by another application.');
        toast.error('Camera/microphone in use by another app');
      } else {
        setMediaPermissionError('Unable to access camera and microphone. Please check your device settings.');
        toast.error('Unable to access camera/microphone');
      }
    }
  };

  // Cleanup local stream
  const cleanupLocalStream = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  useEffect(() => {
    // Only initialize when not in session and no existing stream
    if (!isSessionActive && !localStream) {
      initializeLocalVideo();
    }

    // Cleanup on unmount
    return () => {
      cleanupLocalStream();
    };
  }, [isSessionActive]); // Remove localStream from dependencies to avoid infinite loop

  const handleStartSession = async () => {
    if (!isOnline) {
      toast.error('Internet connection required for video consultation');
      return;
    }

    if (!isConnectedToSupabase) {
      toast.error('Unable to connect to server');
      return;
    }

    if (mediaPermissionError) {
      setShowPermissionModal(true);
      return;
    }

    try {
      // Clean up local stream before starting session
      cleanupLocalStream();
      
      const replicaId = getReplicaId(selectedPersonality);
      const success = await startSession(replicaId, maxSessionTime);
      
      if (success) {
        setSessionStartTime(new Date());
        toast.success('Video consultation started!');
      }
    } catch (error) {
      console.error('Failed to start session:', error);
      toast.error('Failed to start video session');
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
          conversationTranscript: '', // Would be populated from actual conversation
          userFeedback: {
            satisfaction: 4, // Mock data - would come from user input
            helpfulness: 4,
            clarity: 4
          }
        };
        
        await generateReport(reportData);
      }
      
      setSessionStartTime(null);
      toast.success('Video consultation ended');
      
      // Re-initialize local video after session ends
      setTimeout(() => {
        initializeLocalVideo();
      }, 1000); // Small delay to ensure session cleanup
    } catch (error) {
      console.error('Failed to end session:', error);
      toast.error('Failed to end session properly');
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

  const retryMediaAccess = async () => {
    setMediaPermissionError(null);
    setShowPermissionModal(false);
    
    // Clean up existing stream first
    cleanupLocalStream();
    
    // Wait a bit before retrying
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setLocalStream(stream);
        setMediaPermissionError(null);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        toast.success('Camera and microphone access granted!');
      } catch (error: any) {
        console.error('Error accessing media devices:', error);
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setMediaPermissionError('Camera and microphone access denied. Please allow permissions to use video consultation.');
          setShowPermissionModal(true);
        } else {
          setMediaPermissionError('Unable to access camera and microphone. Please check your device settings.');
          toast.error('Unable to access camera/microphone');
        }
      }
    }, 500);
  };

  const personalities = [
    { id: 'supportive', name: 'Supportive & Caring', description: 'Empathetic and understanding' },
    { id: 'professional', name: 'Professional', description: 'Clinical and structured approach' },
    { id: 'friendly', name: 'Friendly & Casual', description: 'Warm and conversational' },
    { id: 'motivational', name: 'Motivational', description: 'Inspiring and encouraging' },
  ];

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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-black rounded-2xl overflow-hidden aspect-video relative"
          >
            {/* AI Video Stream */}
            {isSessionActive && sessionData?.session_url ? (
              <iframe
                src={sessionData.session_url}
                className="w-full h-full"
                allow="camera; microphone"
                title="AI Video Consultation"
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

            {/* Session Timer */}
            {isSessionActive && (
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white px-3 py-2 rounded-lg flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span className="font-mono">{formatDuration(timeRemaining)}</span>
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
                disabled={isLoading || !isOnline || !isConnectedToSupabase || !!mediaPermissionError}
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
          </div>
        </div>

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
              <li>• Review your session reports for insights</li>
            </ul>
          </motion.div>
        </div>
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
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md w-full shadow-xl">
          <div className="text-center mb-6">
            <Shield className="h-16 w-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Camera & Microphone Access Required</h2>
            <p className="text-gray-700 dark:text-gray-300">
              To use video consultation, please allow access to your camera and microphone.
            </p>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">How to enable permissions:</h3>
              <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <li>1. Look for the camera/microphone icon in your browser's address bar</li>
                <li>2. Click on it and select "Allow"</li>
                <li>3. Or go to your browser settings and enable camera/microphone for this site</li>
                <li>4. Refresh the page if needed</li>
              </ol>
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