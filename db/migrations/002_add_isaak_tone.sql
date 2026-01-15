-- Migration: Add isaak_tone to user_preferences
-- Date: 2026-01-15
-- Purpose: Allow users to customize Isaak's conversation tone

-- Add isaak_tone column with default 'friendly'
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS isaak_tone VARCHAR(20) DEFAULT 'friendly';

-- Add check constraint to ensure valid values
ALTER TABLE user_preferences 
ADD CONSTRAINT check_isaak_tone 
CHECK (isaak_tone IN ('friendly', 'professional', 'minimal'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_prefs_tone 
ON user_preferences(isaak_tone);

-- Comment for documentation
COMMENT ON COLUMN user_preferences.isaak_tone IS 
'Isaak conversation tone: friendly (emojis+jokes), professional (formal), minimal (brief)';
