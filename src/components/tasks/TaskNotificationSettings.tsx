import React from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, 
  Clock, 
  Mail, 
  Moon, 
  Settings as SettingsIcon,
  AlertTriangle,
  CheckCircle,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useTaskNotifications } from '../../hooks/useTaskNotifications';

interface TaskNotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TaskNotificationSettings({ isOpen, onClose }: TaskNotificationSettingsProps) {
  const { settings, saveSettings, permission, isQuietHours } = useTaskNotifications();

  if (!isOpen) return null;

  const handleSettingChange = (key: string, value: any) => {
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      saveSettings({
        [parent]: {
          ...settings[parent as keyof typeof settings],
          [child]: value
        }
      });
    } else {
      saveSettings({ [key]: value });
    }
  };

  return (
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
        className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Bell className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Task Notification Settings</h2>
                <p className="text-blue-100">Customize how and when you receive task reminders</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors duration-200"
            >
              <SettingsIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Permission Status */}
          <div className={`mb-6 p-4 rounded-xl border ${
            permission === 'granted' 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
          }`}>
            <div className="flex items-center space-x-3">
              {permission === 'granted' ? (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              )}
              <div>
                <p className={`font-medium ${
                  permission === 'granted' 
                    ? 'text-green-800 dark:text-green-300'
                    : 'text-yellow-800 dark:text-yellow-300'
                }`}>
                  {permission === 'granted' ? 'Notifications Enabled' : 'Notifications Permission Required'}
                </p>
                <p className={`text-sm ${
                  permission === 'granted' 
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-yellow-700 dark:text-yellow-400'
                }`}>
                  {permission === 'granted' 
                    ? 'You will receive browser notifications for your tasks'
                    : 'Please enable notifications to receive task reminders'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Quiet Hours Status */}
          {isQuietHours && (
            <div className="mb-6 p-4 rounded-xl border bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
              <div className="flex items-center space-x-3">
                <Moon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="font-medium text-purple-800 dark:text-purple-300">Quiet Hours Active</p>
                  <p className="text-sm text-purple-700 dark:text-purple-400">
                    Notifications are currently paused during your quiet hours
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* General Settings */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                <Bell className="h-5 w-5 text-blue-500" />
                <span>General Settings</span>
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Enable Task Notifications</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Receive notifications for task reminders and updates
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enabled}
                      onChange={(e) => handleSettingChange('enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Overdue Notifications</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Get notified when tasks become overdue
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.overdueEnabled}
                      onChange={(e) => handleSettingChange('overdueEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Completion Reminders</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Follow-up reminders to check task completion
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.completionReminders}
                      onChange={(e) => handleSettingChange('completionReminders', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Timing Settings */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                <Clock className="h-5 w-5 text-green-500" />
                <span>Timing Settings</span>
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reminder Time (minutes before due date)
                  </label>
                  <select
                    value={settings.reminderMinutes}
                    onChange={(e) => handleSettingChange('reminderMinutes', parseInt(e.target.value))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={120}>2 hours</option>
                    <option value={1440}>1 day</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quiet Hours */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                <Moon className="h-5 w-5 text-purple-500" />
                <span>Quiet Hours</span>
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Enable Quiet Hours</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Pause notifications during specified hours
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.quietHours.enabled}
                      onChange={(e) => handleSettingChange('quietHours.enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {settings.quietHours.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={settings.quietHours.start}
                        onChange={(e) => handleSettingChange('quietHours.start', e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={settings.quietHours.end}
                        onChange={(e) => handleSettingChange('quietHours.end', e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Email Notifications */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                <Mail className="h-5 w-5 text-orange-500" />
                <span>Email Notifications</span>
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Email Reminders</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Receive task reminders via email (coming soon)
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer opacity-50">
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                      disabled
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}