import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useNetworkStatus } from './useNetworkStatus';
import { useNotifications } from './useNotifications';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface TaskNotification {
  id: string;
  task_id: string;
  user_id: string;
  notification_type: 'reminder' | 'overdue' | 'completion_reminder';
  scheduled_for: string;
  sent: boolean;
  email_sent: boolean;
  created_at: string;
}

interface NotificationSettings {
  enabled: boolean;
  reminderMinutes: number; // Minutes before due date
  overdueEnabled: boolean;
  completionReminders: boolean;
  emailNotifications: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  reminderMinutes: 30,
  overdueEnabled: true,
  completionReminders: true,
  emailNotifications: false,
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '08:00'
  }
};

export function useTaskNotifications() {
  const { user, handleSupabaseError } = useAuth();
  const { withRetry, isConnectedToSupabase } = useNetworkStatus();
  const { scheduleNotification, permission } = useNotifications();
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);

  // Check if current time is within quiet hours
  const isQuietHours = useCallback(() => {
    if (!settings.quietHours.enabled) return false;
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const { start, end } = settings.quietHours;
    
    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    }
    
    // Handle same-day quiet hours (e.g., 12:00 to 14:00)
    return currentTime >= start && currentTime <= end;
  }, [settings.quietHours]);

  // Schedule notification for a task
  const scheduleTaskNotification = useCallback(async (
    taskId: string,
    taskTitle: string,
    dueDate: Date,
    notificationType: 'reminder' | 'overdue' | 'completion_reminder' = 'reminder'
  ) => {
    if (!user || !settings.enabled || !isConnectedToSupabase) return;

    try {
      let scheduledFor: Date;
      let title: string;
      let message: string;

      switch (notificationType) {
        case 'reminder':
          scheduledFor = new Date(dueDate.getTime() - settings.reminderMinutes * 60 * 1000);
          title = 'Task Reminder';
          message = `Don't forget: ${taskTitle}`;
          break;
        
        case 'overdue':
          scheduledFor = new Date(dueDate.getTime() + 60 * 60 * 1000); // 1 hour after due
          title = 'Overdue Task';
          message = `Task is overdue: ${taskTitle}`;
          break;
        
        case 'completion_reminder':
          scheduledFor = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
          title = 'Task Completion Check';
          message = `How did it go with: ${taskTitle}?`;
          break;
        
        default:
          return;
      }

      // Don't schedule if it's in the past
      if (scheduledFor <= new Date()) {
        console.log('Skipping notification - scheduled time is in the past');
        return;
      }

      // Adjust for quiet hours
      if (isQuietHours()) {
        const quietEnd = new Date();
        const [endHour, endMinute] = settings.quietHours.end.split(':').map(Number);
        quietEnd.setHours(endHour, endMinute, 0, 0);
        
        // If we're in quiet hours, schedule for when they end
        if (scheduledFor < quietEnd) {
          scheduledFor = quietEnd;
        }
      }

      // Store in database
      const notificationData = {
        task_id: taskId,
        user_id: user.id,
        notification_type: notificationType,
        scheduled_for: scheduledFor.toISOString(),
        sent: false,
        email_sent: false
      };

      const savedNotification = await withRetry(async () => {
        const { data, error } = await supabase
          .from('task_notifications')
          .insert([notificationData])
          .select()
          .single();

        if (error) {
          const isJWTError = await handleSupabaseError(error);
          if (!isJWTError) throw error;
          return null;
        }

        return data;
      });

      if (savedNotification) {
        setNotifications(prev => [...prev, savedNotification]);

        // Schedule browser notification
        await scheduleNotification('task_reminder', title, message, scheduledFor);

        // Schedule email notification if enabled
        if (settings.emailNotifications) {
          // This would integrate with your email service
          console.log('Email notification scheduled:', { title, message, scheduledFor });
        }

        toast.success(`${title} scheduled for ${scheduledFor.toLocaleString()}`);
      }
    } catch (error) {
      console.error('Error scheduling task notification:', error);
      toast.error('Failed to schedule notification');
    }
  }, [user, settings, isConnectedToSupabase, withRetry, handleSupabaseError, scheduleNotification, isQuietHours]);

  // Bulk schedule notifications for a task
  const scheduleAllTaskNotifications = useCallback(async (
    taskId: string,
    taskTitle: string,
    dueDate: Date,
    reminderEnabled: boolean = true
  ) => {
    if (!reminderEnabled || !dueDate) return;

    const promises = [];

    // Schedule reminder notification
    if (settings.enabled) {
      promises.push(scheduleTaskNotification(taskId, taskTitle, dueDate, 'reminder'));
    }

    // Schedule overdue notification
    if (settings.overdueEnabled) {
      promises.push(scheduleTaskNotification(taskId, taskTitle, dueDate, 'overdue'));
    }

    // Schedule completion reminder
    if (settings.completionReminders) {
      promises.push(scheduleTaskNotification(taskId, taskTitle, dueDate, 'completion_reminder'));
    }

    await Promise.all(promises);
  }, [settings, scheduleTaskNotification]);

  // Cancel notifications for a task
  const cancelTaskNotifications = useCallback(async (taskId: string) => {
    if (!user || !isConnectedToSupabase) return;

    try {
      await withRetry(async () => {
        const { error } = await supabase
          .from('task_notifications')
          .delete()
          .eq('task_id', taskId)
          .eq('user_id', user.id)
          .eq('sent', false);

        if (error) {
          const isJWTError = await handleSupabaseError(error);
          if (!isJWTError) throw error;
        }
      });

      setNotifications(prev => prev.filter(n => n.task_id !== taskId || n.sent));
      toast.success('Task notifications cancelled');
    } catch (error) {
      console.error('Error cancelling notifications:', error);
      toast.error('Failed to cancel notifications');
    }
  }, [user, isConnectedToSupabase, withRetry, handleSupabaseError]);

  // Load notification settings
  const loadSettings = useCallback(async () => {
    if (!user || !isConnectedToSupabase) return;

    try {
      const { data, error } = await supabase
        .from('task_notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        const isJWTError = await handleSupabaseError(error);
        if (!isJWTError) throw error;
        return;
      }

      if (data) {
        setSettings({
          enabled: data.enabled ?? DEFAULT_SETTINGS.enabled,
          reminderMinutes: data.reminder_minutes ?? DEFAULT_SETTINGS.reminderMinutes,
          overdueEnabled: data.overdue_enabled ?? DEFAULT_SETTINGS.overdueEnabled,
          completionReminders: data.completion_reminders ?? DEFAULT_SETTINGS.completionReminders,
          emailNotifications: data.email_notifications ?? DEFAULT_SETTINGS.emailNotifications,
          quietHours: {
            enabled: data.quiet_hours_enabled ?? DEFAULT_SETTINGS.quietHours.enabled,
            start: data.quiet_hours_start ?? DEFAULT_SETTINGS.quietHours.start,
            end: data.quiet_hours_end ?? DEFAULT_SETTINGS.quietHours.end,
          }
        });
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  }, [user, isConnectedToSupabase, handleSupabaseError]);

  // Save notification settings
  const saveSettings = useCallback(async (newSettings: Partial<NotificationSettings>) => {
    if (!user || !isConnectedToSupabase) return;

    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);

      await withRetry(async () => {
        const { error } = await supabase
          .from('task_notification_settings')
          .upsert([{
            user_id: user.id,
            enabled: updatedSettings.enabled,
            reminder_minutes: updatedSettings.reminderMinutes,
            overdue_enabled: updatedSettings.overdueEnabled,
            completion_reminders: updatedSettings.completionReminders,
            email_notifications: updatedSettings.emailNotifications,
            quiet_hours_enabled: updatedSettings.quietHours.enabled,
            quiet_hours_start: updatedSettings.quietHours.start,
            quiet_hours_end: updatedSettings.quietHours.end,
          }], {
            onConflict: 'user_id'
          });

        if (error) {
          const isJWTError = await handleSupabaseError(error);
          if (!isJWTError) throw error;
        }
      });

      toast.success('Notification settings saved!');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast.error('Failed to save settings');
    }
  }, [user, settings, isConnectedToSupabase, withRetry, handleSupabaseError]);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!user || !isConnectedToSupabase) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('task_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('scheduled_for', { ascending: false })
        .limit(50);

      if (error) {
        const isJWTError = await handleSupabaseError(error);
        if (!isJWTError) throw error;
        return;
      }

      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user, isConnectedToSupabase, handleSupabaseError]);

  // Initialize
  useEffect(() => {
    if (user && isConnectedToSupabase) {
      loadSettings();
      loadNotifications();
    }
  }, [user, isConnectedToSupabase, loadSettings, loadNotifications]);

  return {
    notifications,
    settings,
    loading,
    permission,
    scheduleTaskNotification,
    scheduleAllTaskNotifications,
    cancelTaskNotifications,
    saveSettings,
    loadNotifications,
    isQuietHours: isQuietHours(),
  };
}