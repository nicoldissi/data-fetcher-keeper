-- Create a new junction table for user-device relationships
CREATE TABLE user_device_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shelly_config_id UUID NOT NULL REFERENCES shelly_configs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, shelly_config_id)
);

-- Copy existing user-device relationships to the new junction table
INSERT INTO user_device_shares (user_id, shelly_config_id)
SELECT user_id, id FROM shelly_configs WHERE user_id IS NOT NULL;

-- Remove the user_id column from shelly_configs
ALTER TABLE shelly_configs DROP COLUMN user_id;

-- Add appropriate indexes
CREATE INDEX idx_user_device_shares_user_id ON user_device_shares(user_id);
CREATE INDEX idx_user_device_shares_shelly_config_id ON user_device_shares(shelly_config_id);