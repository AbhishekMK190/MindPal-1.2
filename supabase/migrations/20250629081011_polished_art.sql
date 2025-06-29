/*
  # Video Reports and Task Notifications Enhancement

  1. New Tables
    - `video_session_reports` - Detailed reports for video consultation sessions
    - `task_notifications` - Individual task notification tracking
    - `task_notification_settings` - User preferences for task notifications

  2. Features
    - Video session analysis and reporting
    - Enhanced task notification system
    - Notification scheduling and management
    - User customizable notification settings

  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to access their own data
*/

-- Video session reports table
CREATE TABLE IF NOT EXISTS video_session_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_duration integer NOT NULL DEFAULT 0,
  conversation_quality text NOT NULL DEFAULT 'good' CHECK (conversation_quality IN ('excellent', 'good', 'fair', 'poor')),
  mood_analysis jsonb NOT NULL DEFAULT '{}',
  ai_insights jsonb NOT NULL DEFAULT '{}',
  technical_metrics jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE video_session_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own video reports"
  ON video_session_reports
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Task notifications table
CREATE TABLE IF NOT EXISTS task_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('reminder', 'overdue', 'completion_reminder')),
  scheduled_for timestamptz NOT NULL,
  sent boolean DEFAULT false,
  email_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE task_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own task notifications"
  ON task_notifications
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Task notification settings table
CREATE TABLE IF NOT EXISTS task_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  enabled boolean DEFAULT true,
  reminder_minutes integer DEFAULT 30,
  overdue_enabled boolean DEFAULT true,
  completion_reminders boolean DEFAULT true,
  email_notifications boolean DEFAULT false,
  quiet_hours_enabled boolean DEFAULT true,
  quiet_hours_start text DEFAULT '22:00',
  quiet_hours_end text DEFAULT '08:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE task_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notification settings"
  ON task_notification_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_video_session_reports_user_id ON video_session_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_video_session_reports_session_id ON video_session_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_video_session_reports_created_at ON video_session_reports(created_at);

CREATE INDEX IF NOT EXISTS idx_task_notifications_user_id ON task_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_task_id ON task_notifications(task_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_scheduled_for ON task_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_task_notifications_pending ON task_notifications(scheduled_for) WHERE NOT sent;

-- Add updated_at trigger for notification settings
DROP TRIGGER IF EXISTS update_task_notification_settings_updated_at ON task_notification_settings;
CREATE TRIGGER update_task_notification_settings_updated_at
  BEFORE UPDATE ON task_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create notification settings on user creation
CREATE OR REPLACE FUNCTION create_task_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO task_notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create notification settings when profile is created
DROP TRIGGER IF EXISTS create_task_notification_settings_trigger ON profiles;
CREATE TRIGGER create_task_notification_settings_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_task_notification_settings();