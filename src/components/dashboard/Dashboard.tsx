import React, { useState, useEffect, useCallback } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { 
  CheckSquare, 
  Heart, 
  Mic, 
  Brain,
  TrendingUp,
  Target,
  Award,
  ExternalLink,
  Plus,
  WifiOff,
  AlertTriangle,
  Sparkles,
  Zap,
  Star,
  Rocket,
  Crown
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { useNavigate, useSearchParams } from 'react-router-dom';

const FloatingElement = ({ children, delay }: { children: React.ReactNode; delay: number }) => (
  <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay, duration: 0.6, ease: "easeOut" }}
    whileHover={{ y: -5, transition: { duration: 0.2 } }}
  >
    {children}
  </motion.div>
);

export function Dashboard() {
  const { user, handleSupabaseError } = useAuth();
  const { isOnline, isConnectedToSupabase } = useNetworkStatus();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { scrollY } = useScroll();

  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    todayMood: null as number | null,
    voiceSessions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const parallaxY = useTransform(scrollY, [0, 500], [0, -150]);
  const parallaxOpacity = useTransform(scrollY, [0, 300], [1, 0.3]);

  // Handle payment success/cancel from URL params
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    
    if (success === 'true') {
      window.history.replaceState({}, '', '/dashboard');
    } else if (canceled === 'true') {
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [searchParams]);

  const loadStats = useCallback(async () => {
    if (!user || dataLoaded) return;

    if (!isConnectedToSupabase) {
      setLoading(false);
      setError('No connection to server');
      return;
    }

    try {
      setError(null);
      
      // Load data sequentially to avoid overwhelming the connection
      console.log('Loading dashboard stats...');
      
      // Load tasks data
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('completed')
        .eq('user_id', user.id)
        .limit(100); // Limit to prevent large queries

      if (taskError) {
        const isJWTError = await handleSupabaseError(taskError);
        if (!isJWTError) {
          console.error('Task loading error:', taskError);
          throw new Error('Failed to load tasks');
        }
        return;
      }

      // Small delay to prevent request flooding
      await new Promise(resolve => setTimeout(resolve, 100));

      // Load mood data
      const today = new Date().toISOString().split('T')[0];
      const { data: moodData, error: moodError } = await supabase
        .from('mood_entries')
        .select('mood')
        .eq('user_id', user.id)
        .gte('created_at', today)
        .order('created_at', { ascending: false })
        .limit(1);

      if (moodError) {
        const isJWTError = await handleSupabaseError(moodError);
        if (!isJWTError) {
          console.error('Mood loading error:', moodError);
          // Don't throw, just log the error
        }
      }

      // Small delay to prevent request flooding
      await new Promise(resolve => setTimeout(resolve, 100));

      // Load voice sessions data
      const { data: voiceData, error: voiceError } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', user.id)
        .limit(50); // Limit to prevent large queries

      if (voiceError) {
        const isJWTError = await handleSupabaseError(voiceError);
        if (!isJWTError) {
          console.error('Voice sessions loading error:', voiceError);
          // Don't throw, just log the error
        }
      }

      setStats({
        totalTasks: taskData?.length || 0,
        completedTasks: taskData?.filter(task => task.completed).length || 0,
        todayMood: moodData?.[0]?.mood || null,
        voiceSessions: voiceData?.length || 0,
      });

      setDataLoaded(true);
      console.log('Dashboard stats loaded successfully');
    } catch (error) {
      console.error('Error loading stats:', error);
      setError('Some data may not be up to date');
    } finally {
      setLoading(false);
    }
  }, [user, handleSupabaseError, isConnectedToSupabase, dataLoaded]);

  useEffect(() => {
    if (user && !dataLoaded) {
      loadStats();
    } else if (!user) {
      setLoading(false);
      setDataLoaded(false);
    }
  }, [user, loadStats, dataLoaded]);

  const handleQuickAction = async (action: string) => {
    try {
      switch (action) {
        case 'voice':
          navigate('/voice');
          break;
        case 'mood':
          navigate('/mood');
          break;
        case 'task':
          navigate('/tasks');
          break;
        case 'retry-connection':
          setLoading(true);
          setDataLoaded(false);
          await loadStats();
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error handling quick action:', error);
    }
  };

  const completionRate = stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0;

  const statCards = [
    {
      title: 'Tasks Completed',
      value: `${stats.completedTasks}/${stats.totalTasks}`,
      subtitle: `${Math.round(completionRate)}% completion rate`,
      icon: CheckSquare,
      color: 'from-green-400 via-emerald-500 to-teal-500',
      bgColor: 'bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/20',
      textColor: 'text-green-700 dark:text-green-400',
      glowColor: 'shadow-green-500/25',
    },
    {
      title: "Today's Mood",
      value: stats.todayMood ? `${stats.todayMood}/10` : 'Not logged',
      subtitle: stats.todayMood ? 'Feeling great!' : 'Log your mood',
      icon: Heart,
      color: 'from-pink-400 via-rose-500 to-red-500',
      bgColor: 'bg-gradient-to-br from-pink-50/50 to-rose-50/50 dark:from-pink-900/20 dark:to-rose-900/20',
      textColor: 'text-pink-700 dark:text-pink-400',
      glowColor: 'shadow-pink-500/25',
    },
    {
      title: 'Chat Sessions',
      value: stats.voiceSessions.toString(),
      subtitle: 'AI conversations',
      icon: Mic,
      color: 'from-purple-400 via-violet-500 to-indigo-500',
      bgColor: 'bg-gradient-to-br from-purple-50/50 to-violet-50/50 dark:from-purple-900/20 dark:to-violet-900/20',
      textColor: 'text-purple-700 dark:text-purple-400',
      glowColor: 'shadow-purple-500/25',
    },
    {
      title: 'Streak',
      value: '7 days',
      subtitle: 'Keep it up!',
      icon: Award,
      color: 'from-orange-400 via-amber-500 to-yellow-500',
      bgColor: 'bg-gradient-to-br from-orange-50/50 to-amber-50/50 dark:from-orange-900/20 dark:to-amber-900/20',
      textColor: 'text-orange-700 dark:text-orange-400',
      glowColor: 'shadow-orange-500/25',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-8">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent mb-2">
            Welcome back, {user?.email?.split('@')[0]}!
          </h1>
          <p className="text-white/60 text-lg">
            {format(new Date(), 'EEEE, MMMM do, yyyy')}
          </p>
        </motion.div>
        
        <div className="flex items-center justify-center h-64">
          <motion.div
            className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      {/* Parallax Background Elements */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ y: parallaxY, opacity: parallaxOpacity }}
      >
        <div className="absolute top-20 left-10">
          <motion.div
            animate={{ rotate: 360, scale: [1, 1.2, 1] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="h-8 w-8 text-purple-300/20" />
          </motion.div>
        </div>
        <div className="absolute top-40 right-20">
          <motion.div
            animate={{ rotate: -360, scale: [1, 1.1, 1] }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          >
            <Zap className="h-6 w-6 text-blue-300/20" />
          </motion.div>
        </div>
        <div className="absolute bottom-20 left-1/4">
          <motion.div
            animate={{ rotate: 360, y: [-10, 10, -10] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          >
            <Star className="h-10 w-10 text-yellow-300/20" />
          </motion.div>
        </div>
      </motion.div>

      {/* Welcome Header */}
      <FloatingElement delay={0}>
        <motion.div
          className="text-center relative"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.h1
            className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent mb-4"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Welcome back, {user?.email?.split('@')[0]}!
          </motion.h1>
          <motion.p
            className="text-white/60 text-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {format(new Date(), 'EEEE, MMMM do, yyyy')}
          </motion.p>
          
          {/* Decorative Elements */}
          <motion.div
            className="absolute -top-4 left-1/2 transform -translate-x-1/2"
            animate={{ y: [-5, 5, -5], rotate: [0, 180, 360] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Crown className="h-8 w-8 text-yellow-400/50" />
          </motion.div>
        </motion.div>
      </FloatingElement>

      {/* Connection Error Banner */}
      {(!isOnline || !isConnectedToSupabase || error) && (
        <FloatingElement delay={0.3}>
          <motion.div
            className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-xl border border-yellow-500/30 rounded-2xl p-6"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  {!isOnline ? (
                    <WifiOff className="h-6 w-6 text-yellow-400" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-yellow-400" />
                  )}
                </motion.div>
                <div>
                  <p className="font-semibold text-yellow-200">
                    {!isOnline ? 'No Internet Connection' : 
                     !isConnectedToSupabase ? 'Server Connection Issues' : 
                     'Data Loading Issues'}
                  </p>
                  <p className="text-sm text-yellow-300/80">
                    {!isOnline 
                      ? 'Some features may not work properly without internet access.'
                      : !isConnectedToSupabase
                      ? 'Cannot connect to Supabase server. Please check your configuration.'
                      : error || 'Some data may not be up to date. The app will continue to work normally.'
                    }
                  </p>
                </div>
              </div>
              <motion.button
                onClick={() => handleQuickAction('retry-connection')}
                className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3 rounded-xl font-semibold transition-colors duration-200"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Retry
              </motion.button>
            </div>
          </motion.div>
        </FloatingElement>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <FloatingElement key={card.title} delay={0.5 + index * 0.1}>
              <motion.div
                className={`${card.bgColor} backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer transform hover:shadow-2xl ${card.glowColor} relative overflow-hidden group`}
                whileHover={{ scale: 1.05, y: -10 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1, duration: 0.6 }}
              >
                {/* Animated Background Gradient */}
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-r ${card.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                  initial={false}
                  animate={{ opacity: [0, 0.05, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <motion.div
                      className={`bg-gradient-to-r ${card.color} p-3 rounded-xl shadow-lg`}
                      whileHover={{ rotate: 360, scale: 1.1 }}
                      transition={{ duration: 0.6 }}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </motion.div>
                    <motion.div
                      animate={{ y: [-2, 2, -2] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <TrendingUp className="h-4 w-4 text-white/40" />
                    </motion.div>
                  </div>
                  <div className={`${card.textColor} space-y-1`}>
                    <p className="text-sm font-medium opacity-80">{card.title}</p>
                    <motion.p
                      className="text-3xl font-bold"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.7 + index * 0.1, type: "spring", stiffness: 200 }}
                    >
                      {card.value}
                    </motion.p>
                    <p className="text-xs opacity-70">{card.subtitle}</p>
                  </div>
                </div>
              </motion.div>
            </FloatingElement>
          );
        })}
      </div>

      {/* Quick Actions */}
      <FloatingElement delay={0.9}>
        <motion.div
          className="bg-black/20 backdrop-blur-xl rounded-2xl p-8 border border-white/10 relative overflow-hidden"
          whileHover={{ scale: 1.01 }}
        >
          {/* Background Animation */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-blue-600/5 to-pink-600/5"
            animate={{ x: [-100, 100, -100] }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          />
          
          <div className="relative z-10">
            <motion.h2
              className="text-3xl font-bold text-white mb-8 flex items-center space-x-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1 }}
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Target className="h-8 w-8 text-purple-400" />
              </motion.div>
              <span>Quick Actions</span>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Rocket className="h-6 w-6 text-blue-400" />
              </motion.div>
            </motion.h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[
                {
                  action: 'voice',
                  icon: Mic,
                  title: 'Voice Chat',
                  subtitle: 'Talk to your AI companion',
                  gradient: 'from-purple-500 via-violet-600 to-indigo-600',
                  delay: 1.1
                },
                {
                  action: 'mood',
                  icon: Heart,
                  title: 'Mood Check',
                  subtitle: 'Log your emotions',
                  gradient: 'from-pink-500 via-rose-600 to-red-600',
                  delay: 1.2
                },
                {
                  action: 'task',
                  icon: CheckSquare,
                  title: 'Add Task',
                  subtitle: 'Create a new reminder',
                  gradient: 'from-green-500 via-emerald-600 to-teal-600',
                  delay: 1.3
                }
              ].map((item) => (
                <motion.button
                  key={item.action}
                  onClick={() => handleQuickAction(item.action)}
                  className={`bg-gradient-to-r ${item.gradient} text-white p-6 rounded-2xl hover:shadow-2xl transition-all duration-300 text-left relative overflow-hidden group`}
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: item.delay, duration: 0.6 }}
                >
                  <motion.div
                    className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    initial={false}
                  />
                  <div className="relative z-10">
                    <motion.div
                      whileHover={{ rotate: 360, scale: 1.2 }}
                      transition={{ duration: 0.6 }}
                    >
                      <item.icon className="h-8 w-8 mb-3" />
                    </motion.div>
                    <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                    <p className="text-sm opacity-90">{item.subtitle}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      </FloatingElement>

      {/* Built on Bolt Badge */}
      <FloatingElement delay={1.6}>
        <motion.div
          className="flex justify-center"
          whileHover={{ scale: 1.05 }}
        >
          <motion.a
            href="https://bolt.new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-6 py-3 rounded-full text-sm font-medium hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group"
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              initial={false}
            />
            <div className="relative z-10 flex items-center space-x-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Brain className="h-4 w-4" />
              </motion.div>
              <span>Built on Bolt</span>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ExternalLink className="h-3 w-3" />
              </motion.div>
            </div>
          </motion.a>
        </motion.div>
      </FloatingElement>
    </div>
  );
}