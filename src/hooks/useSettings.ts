import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useNetworkStatus } from './useNetworkStatus';
import { supabase } from '../lib/supabase';

export interface UserSettings {
  id?: string;
  user_id?: string;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  voice_speed: 'slow' | 'normal' | 'fast';
  ai_personality: 'supportive' | 'professional' | 'friendly' | 'motivational';
  task_reminders: boolean;
  mood_reminders: boolean;
  daily_summary: boolean;
  data_sharing: boolean;
  analytics: boolean;
  voice_recordings: boolean;
  created_at?: string;
  updated_at?: string;
}

const defaultSettings: UserSettings = {
  theme: 'light',
  language: 'en',
  voice_speed: 'normal',
  ai_personality: 'supportive',
  task_reminders: true,
  mood_reminders: true,
  daily_summary: true,
  data_sharing: false,
  analytics: true,
  voice_recordings: true,
};

export function useSettings() {
  const { user, handleSupabaseError } = useAuth();
  const { withRetry, isConnectedToSupabase } = useNetworkStatus();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingDefaults, setCreatingDefaults] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!user || !isConnectedToSupabase) return;

    try {
      setLoading(true);
      const data = await withRetry(async () => {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          const isJWTError = await handleSupabaseError(error);
          if (!isJWTError) throw error;
          return null;
        }

        return data;
      });

      if (data) {
        setSettings(data);
      } else {
        // Create default settings if none exist
        await createDefaultSettings();
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      if (isConnectedToSupabase) {
        // toast.error('Failed to load settings');
      }
    } finally {
      setLoading(false);
    }
  }, [user, isConnectedToSupabase, withRetry, handleSupabaseError]);

  const createDefaultSettings = async () => {
    if (!user || creatingDefaults || !isConnectedToSupabase) return;

    try {
      setCreatingDefaults(true);
      
      await withRetry(async () => {
        const { error } = await supabase
          .from('user_settings')
          .upsert([{ 
            user_id: user.id, 
            ...defaultSettings 
          }], {
            onConflict: 'user_id'
          });

        if (error) {
          const isJWTError = await handleSupabaseError(error);
          if (!isJWTError) throw error;
          return;
        }
      });
      
      setSettings(defaultSettings);
      applyTheme(defaultSettings.theme);
    } catch (error) {
      console.error('Error creating default settings:', error);
      if (isConnectedToSupabase) {
        // toast.error('Failed to create default settings');
      }
    } finally {
      setCreatingDefaults(false);
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) {
      // toast.error('Please sign in to save settings');
      return;
    }

    if (!isConnectedToSupabase) {
      // toast.error('Cannot save settings - no connection to server');
      return;
    }

    try {
      setSaving(true);
      const updatedSettings = { ...settings, ...newSettings };
      
      await withRetry(async () => {
        const { error } = await supabase
          .from('user_settings')
          .upsert([{ 
            user_id: user.id, 
            ...updatedSettings,
            updated_at: new Date().toISOString()
          }], {
            onConflict: 'user_id'
          });

        if (error) {
          const isJWTError = await handleSupabaseError(error);
          if (!isJWTError) throw error;
          return;
        }
      });

      setSettings(updatedSettings);
      
      // Apply theme immediately if changed
      if (newSettings.theme) {
        applyTheme(newSettings.theme);
      }
      
      // toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error updating settings:', error);
      // toast.error('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const applyTheme = (theme: 'light' | 'dark' | 'auto') => {
    const root = document.documentElement;
    
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  };

  useEffect(() => {
    if (user) {
      loadSettings();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Listen for system theme changes when auto mode is enabled
  useEffect(() => {
    if (settings.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('auto');
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [settings.theme]);

  return {
    settings,
    loading,
    saving,
    updateSettings,
  };
}