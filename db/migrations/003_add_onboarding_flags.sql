-- Migration: Add onboarding flags to user_preferences
-- Date: 2026-01-16
-- Purpose: Track user onboarding completion and welcome modal state

-- Add has_completed_onboarding flag
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT FALSE;

-- Add has_seen_welcome flag
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS has_seen_welcome BOOLEAN DEFAULT FALSE;

-- Create index for queries filtering by onboarding status
CREATE INDEX IF NOT EXISTS idx_user_prefs_onboarding 
ON user_preferences(has_completed_onboarding);

-- Add comments
COMMENT ON COLUMN user_preferences.has_completed_onboarding IS 
'Indica si el usuario completó el tour de onboarding inicial (3-4 pasos)';

COMMENT ON COLUMN user_preferences.has_seen_welcome IS 
'Indica si el usuario vio y completó el modal de bienvenida (captura de nombre)';
