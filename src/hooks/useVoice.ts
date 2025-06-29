import { useState, useEffect, useRef, useCallback } from 'react';
import { useSettings } from './useSettings';
import { useNetworkStatus } from './useNetworkStatus';

interface VoiceConfig {
  voiceId: string;
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
}

const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - friendly female voice
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0.0,
  useSpeakerBoost: true,
};

export function useVoice() {
  const { settings } = useSettings();
  const { isOnline } = useNetworkStatus();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);

  const elevenLabsApiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;

  const getVoiceSpeed = useCallback(() => {
    switch (settings.voice_speed) {
      case 'slow': return 0.8;
      case 'fast': return 1.2;
      default: return 1.0;
    }
  }, [settings.voice_speed]);

  const textToSpeech = useCallback(async (text: string): Promise<void> => {
    if (!elevenLabsApiKey) {
      return;
    }

    if (!isOnline) {
      return;
    }

    if (!text.trim()) {
      return;
    }

    try {
      setIsPlaying(true);

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${DEFAULT_VOICE_CONFIG.voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': elevenLabsApiKey,
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: DEFAULT_VOICE_CONFIG.stability,
              similarity_boost: DEFAULT_VOICE_CONFIG.similarityBoost,
              style: DEFAULT_VOICE_CONFIG.style,
              use_speaker_boost: DEFAULT_VOICE_CONFIG.useSpeakerBoost,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Apply voice speed setting
      audio.playbackRate = getVoiceSpeed();

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      await audio.play();
    } catch (error) {
      console.error('Text-to-speech error:', error);
      setIsPlaying(false);
    }
  }, [elevenLabsApiKey, isOnline, getVoiceSpeed]);

  const stopSpeech = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
    }
  }, []);

  const startSpeechRecognition = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!isOnline) {
        reject(new Error('Internet connection required for speech recognition'));
        return;
      }

      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        reject(new Error('Speech recognition not supported in this browser'));
        return;
      }

      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false);
        if (event.error === 'no-speech') {
          // No speech detected
        } else if (event.error === 'audio-capture') {
          // Audio capture error
        } else if (event.error === 'not-allowed') {
          // Permission denied
        } else {
          // Other error
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    });
  }, [isOnline]);

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsRecording(false);
    }
  }, []);

  const speechToSpeech = useCallback(async (): Promise<string> => {
    try {
      // First, get speech input
      const transcript = await startSpeechRecognition();
      
      if (!transcript.trim()) {
        throw new Error('No speech detected');
      }

      return transcript;
    } catch (error) {
      console.error('Speech-to-speech error:', error);
      throw error;
    }
  }, [startSpeechRecognition]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    stopSpeech();
    stopSpeechRecognition();
  }, [stopSpeech, stopSpeechRecognition]);

  return {
    textToSpeech,
    stopSpeech,
    startSpeechRecognition,
    stopSpeechRecognition,
    speechToSpeech,
    isPlaying,
    isRecording,
    cleanup,
    isVoiceEnabled: !!elevenLabsApiKey && isOnline,
  };
}