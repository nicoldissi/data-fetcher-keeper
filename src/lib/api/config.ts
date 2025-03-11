import { ShellyConfig } from '../types';
import { supabase } from '@/integrations/supabase/client';

const SHELLY_CONFIG_KEY = 'shelly_config';

// Legacy localStorage functions (kept for compatibility)
export const updateLocalShellyConfig = (config: ShellyConfig): void => {
  localStorage.setItem(SHELLY_CONFIG_KEY, JSON.stringify(config));
};

const DEFAULT_CONFIG: ShellyConfig = {
  serverUrl: 'https://shelly-11-eu.shelly.cloud',
  deviceId: 'ecfabcc7ebe9',
  apiKey: 'MmIzYzJ1aWQ9E5B47CE0F300842AD58AEC918783E62DADA00AC1D88E8C28721C5CE356A11CA021A43DAE7AE96ED',
  name: 'Default Device',
  deviceType: 'ShellyEM'
};

export const getLocalShellyConfig = (): ShellyConfig => {
  const config = localStorage.getItem(SHELLY_CONFIG_KEY);
  if (!config) return DEFAULT_CONFIG;

  try {
    return JSON.parse(config);
  } catch (error) {
    return DEFAULT_CONFIG;
  }
};

// Interface for the database representation of ShellyConfig (snake_case)
interface DbShellyConfig {
  id?: string; // Optional because it's auto-generated on insert
  deviceid: string;
  apikey: string;
  serverurl: string;
  name?: string;
  created_at?: string; // Optional: timestamps might not always be needed
  updated_at?: string;
  user_id?: string; //Keep in mind this is only set on the shares table,
  device_type?: string;
}

// Helper function to map database fields to frontend model
export const mapDbConfigToFrontend = (dbConfig: DbShellyConfig): ShellyConfig => {
  return {
    id: dbConfig.id,
    deviceId: dbConfig.deviceid,
    apiKey: dbConfig.apikey,
    serverUrl: dbConfig.serverurl,
    name: dbConfig.name,
    deviceType: (dbConfig.device_type as 'ShellyEM' | 'ShellyProEM') || 'ShellyEM' // Cast and provide default
  };
};

// Helper function to map frontend model to database fields
export const mapFrontendToDbConfig = (config: ShellyConfig): DbShellyConfig => {
  return {
    id: config.id,
    deviceid: config.deviceId,
    apikey: config.apiKey,
    serverurl: config.serverUrl,
    name: config.name || 'Default Device',
    device_type: config.deviceType || 'ShellyEM' //Add default value, as it can be undefined.
  };
};

// Helper to handle responses
export interface SupabaseResponse<T> {
  data: T | null;
  error: any | null; // You could use a more specific error type from Supabase if needed
}

export const getShellyConfigs = async (): Promise<ShellyConfig[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [DEFAULT_CONFIG];

    // First, get all shelly_config_ids that the user has access to
    const { data: shareData, error: shareError } = await supabase
      .from('user_device_shares')
      .select('shelly_config_id')
      .eq('user_id', user.id);

    if (shareError) throw shareError;
    
    // If no shares found, return default
    if (!shareData || shareData.length === 0) {
      return [DEFAULT_CONFIG];
    }

    // Extract the IDs into an array
    const configIds = shareData.map(share => share.shelly_config_id);

    // Then query the shelly_configs table using those IDs
    const { data, error } = await supabase
      .from('shelly_configs')
      .select('*')
      .in('id', configIds);

    if (error) throw error;

    if (!data || data.length === 0) {
      // If no configs found, return default
      return [DEFAULT_CONFIG];
    }

    // Map database fields to frontend expected format
    const mappedConfigs = data.map(mapDbConfigToFrontend);

    return mappedConfigs;
  } catch (error) {
    console.error("Error fetching Shelly configs:", error);
    return [DEFAULT_CONFIG];
  }
};

export const getShellyConfig = async (id?: string): Promise<ShellyConfig> => {
  // If no ID provided, try to get from localStorage first (for backward compatibility)
  if (!id) {
    const localConfig = getLocalShellyConfig();
    if (localConfig.deviceId !== DEFAULT_CONFIG.deviceId) {
      return localConfig;
    }
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return DEFAULT_CONFIG;

    // If ID provided, get specific config
    if (id) {
      console.log("Fetching config with ID:", id);
      // Get specific config by ID
      const { data, error } = await supabase
        .from('shelly_configs')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching shelly config:", error);
        throw error;
      }

      if (!data) {
        console.log("No config found for ID:", id);
        return DEFAULT_CONFIG;
      }

      console.log("Raw config from database:", data);
      // Map database fields to frontend expected format
      const mappedConfig = mapDbConfigToFrontend(data);
      console.log("Mapped config:", mappedConfig);
      return mappedConfig;
    } else {
      // First, get the first shelly_config_id that the user has access to
      const { data: shareData, error: shareError } = await supabase
        .from('user_device_shares')
        .select('shelly_config_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (shareError) throw shareError;
      
      if (!shareData) {
        // If no shares found, return default
        return DEFAULT_CONFIG;
      }

      // Then get the config using that ID
      const { data, error } = await supabase
        .from('shelly_configs')
        .select('*')
        .eq('id', shareData.shelly_config_id)
        .single();

      if (error) throw error;

      if (!data) {
        // If no config found, return default
        return DEFAULT_CONFIG;
      }

      // Map database fields to frontend expected format
      return mapDbConfigToFrontend(data);
    }
  } catch (error) {
    console.error("Error fetching Shelly config:", error);
    return DEFAULT_CONFIG;
  }
};

export const updateShellyConfig = async (config: ShellyConfig): Promise<ShellyConfig | null> => {
  try {
    console.log('updateShellyConfig called with:', JSON.stringify(config, null, 2));

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No authenticated user, falling back to localStorage');
      // Fallback to localStorage if not authenticated
      updateLocalShellyConfig(config);
      return config;
    }

    // Ensure required fields are not null or undefined
    if (!config.deviceId) {
      console.error('deviceId is missing or empty');
      throw new Error('deviceId is required');
    }

    if (!config.apiKey) {
      console.error('apiKey is missing or empty');
      throw new Error('apiKey is required');
    }

    if (!config.serverUrl) {
      console.error('serverUrl is missing or empty');
      throw new Error('serverUrl is required');
    }

    let dbConfig;
    if (config.id) {
      // Fetch existing config
      const { data: existingConfig, error: fetchError } = await supabase
        .from('shelly_configs')
        .select('*')
        .eq('id', config.id)
        .single();

      if (fetchError) {
        console.error('Error fetching existing config:', fetchError);
        throw fetchError;
      }

      if (!existingConfig) {
        console.error('Existing config not found with ID:', config.id);
        throw new Error(`Shelly config not found with ID: ${config.id}`);
      }

      // Merge existing config with new values
      const mergedConfig = { ...mapDbConfigToFrontend(existingConfig), ...config };
      dbConfig = mapFrontendToDbConfig(mergedConfig);

      console.log('Updating existing config with ID:', config.id);
      // Update existing config
      const { data, error }: SupabaseResponse<DbShellyConfig> = await supabase
        .from('shelly_configs')
        .update(dbConfig)
        .eq('id', config.id)
        .select('*')
        .single();

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      console.log('Update successful, received data:', data);

      // Convert back to camelCase for the frontend
      if(!data) return null;
      return mapDbConfigToFrontend(data);
    } else {
      // Map frontend model to database fields (without user_id)
      dbConfig = mapFrontendToDbConfig(config);

      console.log('Inserting new config');
      // Insert new config and create the user-device relationship
      const { data, error }: SupabaseResponse<DbShellyConfig> = await supabase
        .from('shelly_configs')
        .insert(dbConfig)
        .select('*')
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      console.log('Insert successful, received data:', data);
      if(!data) return null;

      // Create the user-device relationship
      const { error: shareError } = await supabase
        .from('user_device_shares')
        .insert([{
          user_id: user.id,
          shelly_config_id: data.id
        }]);
      if (shareError) {
        console.error('Error creating user-device relationship:', shareError);
        // Continue anyway since the device was created
      }

      // Convert back to camelCase for the frontend
      return mapDbConfigToFrontend(data);
    }
  } catch (error) {
    console.error("Error updating Shelly config:", error);
    // Fallback to localStorage on error
    updateLocalShellyConfig(config);
    return null;
  }
};

export const deleteShellyConfig = async (id: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // First remove the user-device relationship
    const { error: shareError } = await supabase
      .from('user_device_shares')
      .delete()
      .match({ shelly_config_id: id, user_id: user.id });

    if (shareError) {
      console.error("Error removing user-device relationship:", shareError);
      return false;
    }


    // Check if any other users still have access to this device
    const { data: remainingShares, error: countError } = await supabase
      .from('user_device_shares')
      .select('id')
      .match({ shelly_config_id: id });

    if (countError) {
      console.error("Error checking remaining shares:", countError);
      return false;
    }

    if (!remainingShares) {
      console.error("No remaining shares data:", remainingShares);
      return false;
    }
    // If no other users have access, delete the device config
    if (remainingShares.length === 0) {
      const { error } = await supabase
        .from('shelly_configs')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Error deleting Shelly config:", error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Error deleting Shelly config:", error);
    return false;
  }
};

export const isShellyConfigValid = async (id?: string): Promise<boolean> => {
  try {
    const config = await getShellyConfig(id);
    return !!config.deviceId && !!config.serverUrl && !!config.apiKey; // Use !! for conciseness
  } catch (error) {
    console.error("Error checking Shelly config validity:", error);
    return false;
  }
};

export const getShellyCloudUrl = async (id?: string): Promise<string | null> => {
  const config = await getShellyConfig(id);
  if (!config) return null;
  return `${config.serverUrl}/device/status?id=${config.deviceId}&auth_key=${config.apiKey}`;
};
