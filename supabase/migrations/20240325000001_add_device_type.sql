-- Add device_type column to shelly_configs
ALTER TABLE shelly_configs ADD COLUMN device_type TEXT NOT NULL DEFAULT 'ShellyEM';

-- Add check constraint to ensure only valid device types are allowed
ALTER TABLE shelly_configs ADD CONSTRAINT valid_device_type CHECK (device_type IN ('ShellyEM', 'ShellyProEM'));