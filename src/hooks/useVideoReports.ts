import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useNetworkStatus } from './useNetworkStatus';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface VideoSessionReport {
  id: string;
  session_id: string;
  user_id: string;
  session_duration: number;
  conversation_quality: 'excellent' | 'good' | 'fair' | 'poor';
  mood_analysis: {
    overall_mood: 'positive' | 'negative' | 'neutral';
    stress_level: 'low' | 'medium' | 'high';
    engagement_level: 'high' | 'medium' | 'low';
    emotional_state: string[];
  };
  ai_insights: {
    key_topics: string[];
    recommendations: string[];
    follow_up_actions: string[];
    session_summary: string;
  };
  technical_metrics: {
    connection_quality: 'excellent' | 'good' | 'fair' | 'poor';
    audio_quality: number;
    video_quality: number;
    interruptions: number;
  };
  created_at: string;
}

interface ReportGenerationData {
  sessionId: string;
  duration: number;
  conversationTranscript?: string;
  userFeedback?: {
    satisfaction: number;
    helpfulness: number;
    clarity: number;
  };
}

export function useVideoReports() {
  const { user, handleSupabaseError } = useAuth();
  const { withRetry, isConnectedToSupabase } = useNetworkStatus();
  const [reports, setReports] = useState<VideoSessionReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

  // Generate AI-powered session analysis
  const analyzeSessionData = async (data: ReportGenerationData): Promise<Partial<VideoSessionReport>> => {
    try {
      // Simulate AI analysis (in production, this would call your AI service)
      const mockAnalysis = {
        conversation_quality: 'good' as const,
        mood_analysis: {
          overall_mood: 'positive' as const,
          stress_level: 'medium' as const,
          engagement_level: 'high' as const,
          emotional_state: ['calm', 'focused', 'optimistic']
        },
        ai_insights: {
          key_topics: ['stress management', 'work-life balance', 'goal setting'],
          recommendations: [
            'Continue practicing mindfulness techniques',
            'Schedule regular breaks during work',
            'Consider setting smaller, achievable goals'
          ],
          follow_up_actions: [
            'Practice deep breathing exercises daily',
            'Schedule a follow-up session in 1 week',
            'Track mood daily for better insights'
          ],
          session_summary: `This ${Math.floor(data.duration / 60)}-minute session focused on stress management and personal growth. The user showed high engagement and positive receptivity to suggestions.`
        },
        technical_metrics: {
          connection_quality: 'excellent' as const,
          audio_quality: 0.95,
          video_quality: 0.92,
          interruptions: 0
        }
      };

      return mockAnalysis;
    } catch (error) {
      console.error('Error analyzing session data:', error);
      throw new Error('Failed to analyze session data');
    }
  };

  const generateReport = async (data: ReportGenerationData): Promise<VideoSessionReport | null> => {
    if (!user || !isConnectedToSupabase) {
      toast.error('Cannot generate report - please check your connection');
      return null;
    }

    try {
      setGeneratingReport(true);
      
      // Generate AI analysis
      const analysis = await analyzeSessionData(data);
      
      // Create report object
      const reportData = {
        session_id: data.sessionId,
        user_id: user.id,
        session_duration: data.duration,
        ...analysis,
        created_at: new Date().toISOString()
      };

      // Store in database
      const report = await withRetry(async () => {
        const { data: savedReport, error } = await supabase
          .from('video_session_reports')
          .insert([reportData])
          .select()
          .single();

        if (error) {
          const isJWTError = await handleSupabaseError(error);
          if (!isJWTError) throw error;
          return null;
        }

        return savedReport;
      });

      if (report) {
        setReports(prev => [report, ...prev]);
        toast.success('Video consultation report generated successfully!');
        return report;
      }

      return null;
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate session report');
      return null;
    } finally {
      setGeneratingReport(false);
    }
  };

  const loadReports = useCallback(async () => {
    if (!user || !isConnectedToSupabase) return;

    try {
      setLoading(true);
      
      const data = await withRetry(async () => {
        const { data, error } = await supabase
          .from('video_session_reports')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) {
          const isJWTError = await handleSupabaseError(error);
          if (!isJWTError) throw error;
          return null;
        }

        return data;
      });

      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Failed to load session reports');
    } finally {
      setLoading(false);
    }
  }, [user, handleSupabaseError, withRetry, isConnectedToSupabase]);

  const exportReport = async (reportId: string, format: 'pdf' | 'json' | 'txt' = 'txt') => {
    const report = reports.find(r => r.id === reportId);
    if (!report) {
      toast.error('Report not found');
      return;
    }

    try {
      let content = '';
      
      if (format === 'txt') {
        content = `
MindPal Video Consultation Report
Generated: ${new Date(report.created_at).toLocaleString()}
Session Duration: ${Math.floor(report.session_duration / 60)} minutes

MOOD ANALYSIS:
- Overall Mood: ${report.mood_analysis.overall_mood}
- Stress Level: ${report.mood_analysis.stress_level}
- Engagement: ${report.mood_analysis.engagement_level}
- Emotional State: ${report.mood_analysis.emotional_state.join(', ')}

AI INSIGHTS:
Key Topics Discussed:
${report.ai_insights.key_topics.map(topic => `- ${topic}`).join('\n')}

Recommendations:
${report.ai_insights.recommendations.map(rec => `- ${rec}`).join('\n')}

Follow-up Actions:
${report.ai_insights.follow_up_actions.map(action => `- ${action}`).join('\n')}

Session Summary:
${report.ai_insights.session_summary}

TECHNICAL METRICS:
- Connection Quality: ${report.technical_metrics.connection_quality}
- Audio Quality: ${(report.technical_metrics.audio_quality * 100).toFixed(1)}%
- Video Quality: ${(report.technical_metrics.video_quality * 100).toFixed(1)}%
- Interruptions: ${report.technical_metrics.interruptions}
        `.trim();
      } else if (format === 'json') {
        content = JSON.stringify(report, null, 2);
      }

      // Create and download file
      const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mindpal-session-report-${report.session_id}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  const shareReport = async (reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) {
      toast.error('Report not found');
      return;
    }

    try {
      const shareText = `MindPal Video Consultation Report - ${new Date(report.created_at).toLocaleDateString()}
      
Session Summary: ${report.ai_insights.session_summary}

Key Insights:
${report.ai_insights.recommendations.slice(0, 3).map(rec => `• ${rec}`).join('\n')}`;

      if (navigator.share) {
        await navigator.share({
          title: 'MindPal Session Report',
          text: shareText,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast.success('Report summary copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing report:', error);
      toast.error('Failed to share report');
    }
  };

  return {
    reports,
    loading,
    generatingReport,
    generateReport,
    loadReports,
    exportReport,
    shareReport,
  };
}