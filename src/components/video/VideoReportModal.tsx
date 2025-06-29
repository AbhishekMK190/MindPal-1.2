import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Download, 
  Share2, 
  FileText, 
  Brain, 
  Heart, 
  TrendingUp,
  Clock,
  Wifi,
  Volume2,
  Video,
  AlertCircle,
  CheckCircle,
  Star
} from 'lucide-react';

interface VideoSessionReport {
  id: string;
  session_id: string;
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

interface VideoReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: VideoSessionReport | null;
  onExport: (reportId: string, format: 'pdf' | 'json' | 'txt') => void;
  onShare: (reportId: string) => void;
}

export function VideoReportModal({ isOpen, onClose, report, onExport, onShare }: VideoReportModalProps) {
  if (!report) return null;

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
      case 'good': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400';
      case 'fair': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'poor': return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'positive': return 'text-green-600 dark:text-green-400';
      case 'negative': return 'text-red-600 dark:text-red-400';
      case 'neutral': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStressColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 dark:text-green-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'high': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Video Consultation Report</h2>
                    <p className="text-purple-100">
                      Session on {new Date(report.created_at).toLocaleDateString()} • {formatDuration(report.session_duration)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onExport(report.id, 'txt')}
                    className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors duration-200"
                    title="Export Report"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => onShare(report.id)}
                    className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors duration-200"
                    title="Share Report"
                  >
                    <Share2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={onClose}
                    className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors duration-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Session Overview */}
                <div className="space-y-6">
                  {/* Quality Metrics */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      <span>Session Quality</span>
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Overall Quality:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getQualityColor(report.conversation_quality)}`}>
                          {report.conversation_quality}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatDuration(report.session_duration)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Technical Metrics */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                      <Wifi className="h-5 w-5 text-blue-500" />
                      <span>Technical Performance</span>
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Wifi className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">Connection:</span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getQualityColor(report.technical_metrics.connection_quality)}`}>
                          {report.technical_metrics.connection_quality}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Volume2 className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">Audio Quality:</span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {(report.technical_metrics.audio_quality * 100).toFixed(1)}%
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Video className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">Video Quality:</span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {(report.technical_metrics.video_quality * 100).toFixed(1)}%
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">Interruptions:</span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {report.technical_metrics.interruptions}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Analysis Results */}
                <div className="space-y-6">
                  {/* Mood Analysis */}
                  <div className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-pink-200 dark:border-pink-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                      <Heart className="h-5 w-5 text-pink-500" />
                      <span>Mood Analysis</span>
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Overall Mood:</span>
                        <span className={`font-semibold ${getMoodColor(report.mood_analysis.overall_mood)}`}>
                          {report.mood_analysis.overall_mood}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Stress Level:</span>
                        <span className={`font-semibold ${getStressColor(report.mood_analysis.stress_level)}`}>
                          {report.mood_analysis.stress_level}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Engagement:</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {report.mood_analysis.engagement_level}
                        </span>
                      </div>
                      
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 block mb-2">Emotional State:</span>
                        <div className="flex flex-wrap gap-2">
                          {report.mood_analysis.emotional_state.map((emotion, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm"
                            >
                              {emotion}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Insights */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                      <Brain className="h-5 w-5 text-blue-500" />
                      <span>AI Insights</span>
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Key Topics Discussed:</h4>
                        <ul className="space-y-1">
                          {report.ai_insights.key_topics.map((topic, index) => (
                            <li key={index} className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                              <span>{topic}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Session Summary */}
              <div className="mt-6 bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <span>Session Summary</span>
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {report.ai_insights.session_summary}
                </p>
              </div>

              {/* Recommendations */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recommendations</h3>
                  <ul className="space-y-2">
                    {report.ai_insights.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start space-x-2 text-gray-600 dark:text-gray-400">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Follow-up Actions</h3>
                  <ul className="space-y-2">
                    {report.ai_insights.follow_up_actions.map((action, index) => (
                      <li key={index} className="flex items-start space-x-2 text-gray-600 dark:text-gray-400">
                        <Clock className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Export Options */}
              <div className="mt-6 bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Export Options</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => onExport(report.id, 'txt')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export as Text</span>
                  </button>
                  <button
                    onClick={() => onExport(report.id, 'json')}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export as JSON</span>
                  </button>
                  <button
                    onClick={() => onShare(report.id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                  >
                    <Share2 className="h-4 w-4" />
                    <span>Share Summary</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}