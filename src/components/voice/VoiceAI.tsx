import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  MessageSquare, 
  Send, 
  Mic, 
  MicOff, 
  Plus,
  Trash2,
  Share2,
  FileText,
  Edit3,
  MessageCircle,
  WifiOff,
  AlertTriangle,
  Volume2,
  VolumeX,
  Headphones
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSettings } from '../../hooks/useSettings';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useVoice } from '../../hooks/useVoice';
import { useChatSessions } from '../../hooks/useChatSessions';
import toast from 'react-hot-toast';

const getGeminiResponse = async (input: string, personality: string, conversationHistory: string = ''): Promise<string> => {
  try {
    const personalityPrompts = {
      supportive: "You are a supportive and caring AI companion. Respond with empathy and encouragement.",
      professional: "You are a professional AI assistant. Provide clear, concise, and helpful responses.",
      friendly: "You are a friendly and casual AI companion. Be warm and conversational in your responses.",
      motivational: "You are a motivational AI coach. Inspire and encourage the user to achieve their goals."
    };

    const systemPrompt = personalityPrompts[personality as keyof typeof personalityPrompts] || personalityPrompts.supportive;
    const contextPrompt = conversationHistory ? `Previous conversation context:\n${conversationHistory}\n\n` : '';
    const fullPrompt = `${systemPrompt}\n\n${contextPrompt}User: ${input}\n\nAssistant:`;

    // Note: Replace with your actual Gemini API key
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }]
        })
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to get AI response');
    }
    
    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm here to help! Could you please rephrase your question?";
    return aiResponse;
  } catch (err) {
    console.error('Gemini API error:', err);
    return "I'm having trouble connecting right now. Please try again in a moment.";
  }
};

const generateAIReport = async (messages: any[]): Promise<any> => {
  try {
    const userMessages = messages.filter(m => m.message_type === 'user').map(m => m.content).join(' ');
    
    const reportPrompt = `Analyze the following conversation and provide a detailed psychological and emotional report in JSON format:

Conversation: "${userMessages}"

Please provide a JSON response with the following structure:
{
  "overall_mood": "positive/negative/neutral",
  "emotions": ["array", "of", "detected", "emotions"],
  "stress_level": "low/medium/high",
  "recommendations": ["array", "of", "helpful", "suggestions"],
  "summary": "detailed summary of the user's emotional state and mental health",
  "key_concerns": ["array", "of", "main", "concerns"],
  "positive_indicators": ["array", "of", "positive", "signs"],
  "confidence_score": 0.85
}

Base your analysis on psychological principles and provide actionable insights.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: reportPrompt }] }]
        })
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to generate AI report');
    }
    
    const data = await response.json();
    const reportText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extract JSON from the response
    const jsonMatch = reportText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback if JSON parsing fails
    return {
      overall_mood: 'neutral',
      emotions: ['mixed'],
      stress_level: 'medium',
      recommendations: ['Continue regular check-ins with mental health'],
      summary: 'Unable to generate detailed analysis. Please try again.',
      key_concerns: [],
      positive_indicators: [],
      confidence_score: 0.5
    };
  } catch (error) {
    console.error('Error generating AI report:', error);
    throw error;
  }
};

// Add translation utility
const translateText = async (text: string, targetLang: string, sourceLang: string = 'auto'): Promise<string> => {
  if (!text.trim() || targetLang === 'en') return text;
  try {
    const response = await fetch('https://api.lingoapi.com/v1/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': import.meta.env.VITE_LINGO_API_KEY,
      },
      body: JSON.stringify({
        q: text,
        source: sourceLang,
        target: targetLang,
        format: 'text',
      }),
    });
    if (!response.ok) throw new Error('Translation failed');
    const data = await response.json();
    return data.translatedText || text;
  } catch (err) {
    console.error('Lingo API error:', err);
    return text;
  }
};

export function VoiceAI() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { isOnline, isConnectedToSupabase } = useNetworkStatus();
  const {
    textToSpeech,
    stopSpeech,
    speechToSpeech,
    isPlaying,
    isRecording,
    cleanup,
    isVoiceEnabled,
    stopSpeechRecognition,
  } = useVoice();
  const {
    sessions,
    currentSession,
    messages,
    setCurrentSession,
    loadMessages,
    createNewSession,
    addMessage,
    deleteSession,
    updateSessionTitle,
    shareChatSession,
  } = useChatSessions();

  const [isProcessing, setIsProcessing] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [showSessions, setShowSessions] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [moodReport, setMoodReport] = useState<any>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [continuousMode, setContinuousMode] = useState(false);
  const continuousRef = useRef(false);

  const isSpeechRecognitionSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  const canUseVoice = isOnline && isSpeechRecognitionSupported && isVoiceEnabled;
  const canUseAI = isOnline && isConnectedToSupabase;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Infinite voice conversation loop
  const startContinuousVoiceConversation = useCallback(async () => {
    continuousRef.current = true;
    while (continuousRef.current) {
      try {
        // Listen for user speech
        const transcript = await speechToSpeech();
        if (!continuousRef.current) break;
        if (transcript.trim()) {
          // Process input (no UI update, just voice)
          let translatedInput = transcript;
          if (settings.language && settings.language !== 'en') {
            translatedInput = await translateText(transcript, 'en', settings.language);
          }
          // Get conversation history (optional: can be omitted for pure voice loop)
          const aiResponse = await getGeminiResponse(translatedInput, settings.ai_personality, '');
          let finalResponse = aiResponse;
          if (settings.language && settings.language !== 'en') {
            finalResponse = await translateText(aiResponse, settings.language, 'en');
          }
          // Speak the AI response
          await textToSpeech(finalResponse);
        }
      } catch (err) {
        if (!continuousRef.current) break;
        // Optionally, handle errors (e.g., no speech detected)
      }
    }
  }, [speechToSpeech, textToSpeech, settings.language, settings.ai_personality, translateText]);

  const stopContinuousVoiceConversation = useCallback(() => {
    continuousRef.current = false;
    stopSpeech();
    stopSpeechRecognition();
  }, [stopSpeech, stopSpeechRecognition]);

  useEffect(() => {
    if (continuousMode) {
      startContinuousVoiceConversation();
    } else {
      stopContinuousVoiceConversation();
    }
    return () => stopContinuousVoiceConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [continuousMode]);

  const processChatInput = async (input: string, shouldSpeak: boolean = false) => {
    if (!input.trim() || !user) return;
    
    if (!canUseAI) {
      toast.error('Cannot send message - no connection to server');
      return;
    }
    
    let sessionToUse = currentSession;
    
    // Create new session if none exists
    if (!sessionToUse) {
      sessionToUse = await createNewSession();
      if (!sessionToUse) return;
    }
    
    setIsProcessing(true);
    
    try {
      // Translate user input to English if needed
      let translatedInput = input;
      if (settings.language && settings.language !== 'en') {
        translatedInput = await translateText(input, 'en', settings.language);
      }
      // Add user message (in original language)
      await addMessage(sessionToUse.id, 'user', input);
      
      // Get conversation history for context
      const conversationHistory = messages
        .slice(-10) // Last 10 messages for context
        .map(m => `${m.message_type === 'user' ? 'User' : 'AI'}: ${m.content}`)
        .join('\n');
      
      // Get AI response with context (in English)
      const aiResponse = await getGeminiResponse(translatedInput, settings.ai_personality, conversationHistory);
      
      // Translate AI response back to user's language if needed
      let finalResponse = aiResponse;
      if (settings.language && settings.language !== 'en') {
        finalResponse = await translateText(aiResponse, settings.language, 'en');
      }
      // Add AI response (in user's language)
      await addMessage(sessionToUse.id, 'ai', finalResponse);
      
      // Speak the AI response if auto-speak is enabled or explicitly requested
      if ((autoSpeak || shouldSpeak) && isVoiceEnabled) {
        await textToSpeech(finalResponse);
      }
      
      toast.success('AI response generated!');
    } catch (error) {
      console.error('Error processing chat input:', error);
      toast.error('Failed to process your request');
    } finally {
      setIsProcessing(false);
      setTextInput('');
    }
  };

  const handleVoiceInput = async () => {
    if (!canUseVoice) {
      if (!isOnline) {
        toast.error('Voice features require an internet connection');
      } else if (!isSpeechRecognitionSupported) {
        toast.error('Speech recognition not supported in this browser');
      } else if (!isVoiceEnabled) {
        toast.error('ElevenLabs API key not configured');
      }
      return;
    }

    try {
      const transcript = await speechToSpeech();
      if (transcript.trim()) {
        await processChatInput(transcript, true); // Auto-speak response for voice input
      }
    } catch (error) {
      console.error('Voice input error:', error);
      toast.error(error instanceof Error ? error.message : 'Voice input failed');
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      processChatInput(textInput);
    }
  };

  const handleSessionSelect = async (session: any) => {
    setCurrentSession(session);
    await loadMessages(session.id);
    setShowSessions(false);
  };

  const handleNewChat = async () => {
    await createNewSession();
    setShowSessions(false);
  };

  const handleGenerateReport = async () => {
    if (!currentSession || messages.length === 0) {
      toast.error('No conversation to analyze');
      return;
    }

    if (!canUseAI) {
      toast.error('Cannot generate report - no connection to server');
      return;
    }
    
    try {
      setIsProcessing(true);
      const report = await generateAIReport(messages);
      setMoodReport(report);
      toast.success('AI report generated successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTitleUpdate = async (sessionId: string, newTitle: string) => {
    await updateSessionTitle(sessionId, newTitle);
    setEditingTitle(null);
  };

  const handleShareChat = async (sessionId: string) => {
    try {
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;

      // Get messages for this session
      const sessionMessages = messages.filter(m => m.session_id === sessionId);
      
      // Format as readable text
      const chatText = sessionMessages
        .map(m => `${m.message_type === 'user' ? 'You' : 'AI'}: ${m.content}`)
        .join('\n\n');
      
      const shareText = `MindPal Chat: ${session.title}\n\n${chatText}`;

      if (navigator.share) {
        await navigator.share({
          title: `MindPal Chat: ${session.title}`,
          text: shareText,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast.success('Chat copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing session:', error);
      toast.error('Failed to share session');
    }
  };

  const handleSpeakMessage = async (content: string) => {
    if (!isVoiceEnabled) {
      toast.error('Text-to-speech not available');
      return;
    }

    if (isPlaying) {
      stopSpeech();
    } else {
      await textToSpeech(content);
    }
  };

  return (
    <div className="space-y-6">
      {/* Always-visible Continuous Voice Mode Toggle */}
      <div className="flex justify-center mt-4 mb-2">
        <button
          onClick={() => setContinuousMode((m) => !m)}
          className={`flex items-center px-6 py-3 rounded-2xl text-lg font-semibold shadow transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 border-2 border-blue-200 dark:border-blue-700
            ${continuousMode
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-white dark:bg-gray-900 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-800'}
          `}
          title={continuousMode ? 'Continuous Voice Mode ON' : 'Continuous Voice Mode OFF'}
        >
          {continuousMode ? <Mic className="h-6 w-6 mr-2" /> : <MicOff className="h-6 w-6 mr-2" />}
          {continuousMode ? 'Stop Voice Chat' : 'Start Voice Chat'}
        </button>
      </div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Voice AI Companion</h1>
          <p className="text-gray-300">
            {currentSession ? `Chat: ${currentSession.title}` : 'Start a new conversation'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Voice Settings */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoSpeak(!autoSpeak)}
              className={`p-2 rounded-lg transition-colors duration-200 ${
                autoSpeak 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}
              title={autoSpeak ? 'Auto-speak enabled' : 'Auto-speak disabled'}
            >
              {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            {isVoiceEnabled && (
              <div className="flex items-center space-x-1 text-xs text-green-600 dark:text-green-400">
                <Headphones className="h-3 w-3" />
                <span>Voice Ready</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowSessions(!showSessions)}
            disabled={!canUseAI}
            className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-4 py-2 rounded-xl hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Chats</span>
          </button>
          <button
            onClick={handleNewChat}
            disabled={!canUseAI}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-xl hover:shadow-lg transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Connection Status Warning */}
      {(!isOnline || !isConnectedToSupabase || !isVoiceEnabled) && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4"
        >
          <div className="flex items-center space-x-3">
            {!isOnline ? (
              <WifiOff className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            )}
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-300">
                {!isOnline ? 'No Internet Connection' : 
                 !isConnectedToSupabase ? 'Server Connection Issues' : 
                 'Voice Features Limited'}
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                {!isOnline 
                  ? 'Voice recognition and AI chat are unavailable without internet access.'
                  : !isConnectedToSupabase
                  ? 'AI chat and data sync may not work properly. Please check your connection.'
                  : 'ElevenLabs API key not configured. Text-to-speech features unavailable.'
                }
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Sessions Sidebar */}
      <AnimatePresence>
        {showSessions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Chat Sessions</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors duration-200 ${
                    currentSession?.id === session.id
                      ? 'bg-purple-100 dark:bg-purple-900/30'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex-1" onClick={() => handleSessionSelect(session)}>
                    {editingTitle === session.id ? (
                      <input
                        type="text"
                        defaultValue={session.title}
                        className="w-full bg-transparent border-none focus:outline-none text-gray-900 dark:text-white"
                        onBlur={(e) => handleTitleUpdate(session.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleTitleUpdate(session.id, e.currentTarget.value);
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{session.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(session.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTitle(editingTitle === session.id ? null : session.id);
                      }}
                      className="text-gray-400 hover:text-blue-500 transition-colors duration-200"
                      title="Edit title"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShareChat(session.id);
                      }}
                      className="text-gray-400 hover:text-green-500 transition-colors duration-200"
                      title="Share chat"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className="text-gray-400 hover:text-red-500 transition-colors duration-200"
                      title="Delete chat"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              
              {sessions.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No chat sessions yet. Start your first conversation!
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Interface */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl border border-purple-100 dark:border-purple-800"
      >
        {/* Chat Messages */}
        <div className="p-6 pb-0">
          <div className="max-h-96 overflow-y-auto space-y-4 mb-4">
            {messages.length === 0 && !currentSession && (
              <div className="text-center text-gray-400 dark:text-gray-500 py-8">
                <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p>Start a new conversation or select an existing chat!</p>
                {!canUseAI && (
                  <p className="text-sm mt-2 text-yellow-600 dark:text-yellow-400">
                    Connection required for AI features
                  </p>
                )}
              </div>
            )}
            
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.message_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs sm:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl break-words ${
                  message.message_type === 'user' 
                    ? 'bg-purple-600 text-white ml-8' 
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white mr-8 border border-gray-200 dark:border-gray-700'
                }`}>
                  <div className="flex items-start space-x-2">
                    {message.message_type === 'ai' && (
                      <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm">{message.content}</p>
                      {message.message_type === 'ai' && isVoiceEnabled && (
                        <button
                          onClick={() => handleSpeakMessage(message.content)}
                          className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200 flex items-center space-x-1"
                        >
                          {isPlaying ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                          <span>{isPlaying ? 'Stop' : 'Speak'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {isProcessing && (
            <div className="text-center mb-4">
              <div className="inline-flex items-center space-x-2 text-purple-600 dark:text-purple-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                <span>AI is thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area (hide in continuous mode) */}
        {!continuousMode && (
          <div className="p-6 pt-0 border-t border-purple-200 dark:border-purple-700">
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <form onSubmit={handleTextSubmit} className="flex items-center space-x-2 flex-1 max-w-2xl">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-purple-200 dark:border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
                  placeholder={canUseAI ? "Type your message..." : "Connection required for messaging"}
                  disabled={isProcessing || isRecording || !canUseAI}
                />
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isProcessing || !textInput.trim() || isRecording || !canUseAI}
                  title="Send"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleVoiceInput}
                  disabled={isProcessing || !canUseVoice}
                  className={`px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isRecording
                      ? 'bg-red-600 hover:bg-red-700 text-white recording-pulse'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                  title={!canUseVoice ? 'Voice features require internet connection and API key' : 'Start voice conversation'}
                >
                  {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  <span className="hidden sm:inline">{isRecording ? 'Listening...' : 'Voice'}</span>
                </button>
                
                {currentSession && messages.length > 0 && (
                  <button
                    onClick={handleGenerateReport}
                    disabled={isProcessing || !canUseAI}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Generate AI mood report"
                  >
                    <FileText className="h-5 w-5" />
                    <span className="hidden sm:inline">Report</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Mood Report Modal */}
      <AnimatePresence>
        {moodReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setMoodReport(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">AI-Generated Mood Analysis Report</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="font-medium text-gray-700 dark:text-gray-300">Overall Mood:</p>
                  <p className={`text-lg font-semibold ${
                    moodReport.overall_mood === 'positive' ? 'text-green-600' :
                    moodReport.overall_mood === 'negative' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {moodReport.overall_mood.charAt(0).toUpperCase() + moodReport.overall_mood.slice(1)}
                  </p>
                </div>
                
                <div>
                  <p className="font-medium text-gray-700 dark:text-gray-300">Stress Level:</p>
                  <p className={`text-lg font-semibold ${
                    moodReport.stress_level === 'low' ? 'text-green-600' :
                    moodReport.stress_level === 'medium' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {moodReport.stress_level.charAt(0).toUpperCase() + moodReport.stress_level.slice(1)}
                  </p>
                </div>
                
                {moodReport.emotions && moodReport.emotions.length > 0 && (
                  <div>
                    <p className="font-medium text-gray-700 dark:text-gray-300">Detected Emotions:</p>
                    <p className="text-gray-600 dark:text-gray-400">{moodReport.emotions.join(', ')}</p>
                  </div>
                )}
                
                <div>
                  <p className="font-medium text-gray-700 dark:text-gray-300">Summary:</p>
                  <p className="text-gray-600 dark:text-gray-400">{moodReport.summary}</p>
                </div>
                
                {moodReport.key_concerns && moodReport.key_concerns.length > 0 && (
                  <div>
                    <p className="font-medium text-gray-700 dark:text-gray-300">Key Concerns:</p>
                    <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                      {moodReport.key_concerns.map((concern: string, index: number) => (
                        <li key={index}>{concern}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {moodReport.positive_indicators && moodReport.positive_indicators.length > 0 && (
                  <div>
                    <p className="font-medium text-gray-700 dark:text-gray-300">Positive Indicators:</p>
                    <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                      {moodReport.positive_indicators.map((indicator: string, index: number) => (
                        <li key={index}>{indicator}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {moodReport.recommendations && moodReport.recommendations.length > 0 && (
                  <div>
                    <p className="font-medium text-gray-700 dark:text-gray-300">AI Recommendations:</p>
                    <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                      {moodReport.recommendations.map((rec: string, index: number) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {moodReport.confidence_score && (
                  <div>
                    <p className="font-medium text-gray-700 dark:text-gray-300">Confidence Score:</p>
                    <p className="text-gray-600 dark:text-gray-400">{(moodReport.confidence_score * 100).toFixed(0)}%</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    const reportText = `AI Mood Analysis Report\n\nOverall Mood: ${moodReport.overall_mood}\nStress Level: ${moodReport.stress_level}\nEmotions: ${moodReport.emotions?.join(', ') || 'N/A'}\n\nSummary: ${moodReport.summary}\n\nRecommendations:\n${moodReport.recommendations?.map((r: string) => `• ${r}`).join('\n') || 'None'}`;
                    navigator.clipboard.writeText(reportText);
                    toast.success('Report copied to clipboard!');
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                >
                  Copy Report
                </button>
                <button
                  onClick={() => setMoodReport(null)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Privacy Notice */}
      {settings.voice_recordings && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4"
        >
          <p className="text-sm text-blue-800 dark:text-blue-300">
            🔒 Your conversations are encrypted and stored securely. AI remembers context within each chat session. Voice synthesis powered by ElevenLabs. You can disable voice recording storage in Settings.
          </p>
        </motion.div>
      )}
    </div>
  );
}