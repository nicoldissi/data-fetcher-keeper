-- Enable RLS on shelly_configs table
ALTER TABLE shelly_configs ENABLE ROW LEVEL SECURITY;

-- Policy for inserting new shelly_configs
-- This policy allows any authenticated user to insert new configs
-- The user-device relationship will be established separately in the junction table
CREATE POLICY "Users can insert their own shelly configs"
    ON shelly_configs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy for selecting shelly_configs
-- Users can only select configs they have access to through the junction table
CREATE POLICY "Users can view their shared shelly configs"
    ON shelly_configs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM user_device_shares
            WHERE user_device_shares.shelly_config_id = id
            AND user_device_shares.user_id = auth.uid()
        )
    );

-- Policy for updating shelly_configs
-- Users can only update configs they have access to through the junction table
CREATE POLICY "Users can update their shared shelly configs"
    ON shelly_configs
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM user_device_shares
            WHERE user_device_shares.shelly_config_id = id
            AND user_device_shares.user_id = auth.uid()
        )
    );

-- Policy for deleting shelly_configs
-- Users can only delete configs they have access to through the junction table
CREATE POLICY "Users can delete their shared shelly configs"
    ON shelly_configs
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM user_device_shares
            WHERE user_device_shares.shelly_config_id = id
            AND user_device_shares.user_id = auth.uid()
        )
    );