import { ShellyConfig, ShellyEMData, ShellyEMResponse } from './types';
import { supabase } from '@/integrations/supabase/client';

const SHELLY_CONFIG_KEY = 'shelly_config';

// Legacy localStorage functions
export const updateLocalShellyConfig = (config: ShellyConfig): void => {
  localStorage.setItem(SHELLY_CONFIG_KEY, JSON.stringify(config));
};

const DEFAULT_CONFIG: ShellyConfig = {
  serverUrl: 'https://shelly-11-eu.shelly.cloud',
  deviceId: 'ecfabcc7ebe9',
  apiKey: 'MmIzYzJ1aWQ9E5B47CE0F300842AD58AEC918783E62DADA00AC1D88E8C28721C5CE356A11CA021A43DAE7AE96ED',
  name: 'Default Device'
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

// Helper function to map database fields to frontend model
const mapDbConfigToFrontend = (dbConfig: any): ShellyConfig => {
  return {
    id: dbConfig.id,
    deviceId: dbConfig.deviceid,
    apiKey: dbConfig.apikey,
    serverUrl: dbConfig.serverurl,
    name: dbConfig.name,
    deviceType: dbConfig.device_type || 'ShellyEM',
    user_id: dbConfig.user_id
  };
};

// Helper function to map frontend model to database fields
const mapFrontendToDbConfig = (config: ShellyConfig): any => {
  return {
    id: config.id,
    deviceid: config.deviceId,
    apikey: config.apiKey,
    serverurl: config.serverUrl,
    name: config.name || 'Default Device',
    device_type: config.deviceType || 'ShellyEM',
    user_id: config.user_id
  };
};

// New Supabase functions
export const getShellyConfigs = async (): Promise<ShellyConfig[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [DEFAULT_CONFIG];

    const { data, error } = await supabase
      .from('shelly_configs')
      .select('*')
      .eq('user_id', user.id);
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      // If no configs found, return default
      return [DEFAULT_CONFIG];
    }
    
    // Map database fields to frontend expected format
    const mappedConfigs = data.map(config => mapDbConfigToFrontend(config));
    
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

    // If ID provided, get specific config, otherwise get first config
    const query = supabase
      .from('shelly_configs')
      .select('*')
      .eq('user_id', user.id);
    
    if (id) {
      query.eq('id', id);
    }
    
    const { data, error } = await query.order('created_at', { ascending: true }).limit(1);
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      // If no configs found, return default
      return DEFAULT_CONFIG;
    }
    
    // Map database fields to frontend expected format
    return mapDbConfigToFrontend(data[0]);
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

    // Set the user_id for the config
    const configWithUser = {
      ...config,
      user_id: user.id
    };

    // Map frontend model to database fields
    const dbConfig = mapFrontendToDbConfig(configWithUser);
    
    console.log('Prepared database config:', JSON.stringify(dbConfig, null, 2));

    // Check if config already has an ID (update) or not (insert)
    if (config.id) {
      console.log('Updating existing config with ID:', config.id);
      // Update existing config
      const { data, error } = await supabase
        .from('shelly_configs')
        .update(dbConfig)
        .eq('id', config.id)
        .eq('user_id', user.id)
        .select('*')
        .single();
      
      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }
      
      console.log('Update successful, received data:', data);
      
      // Convert back to camelCase for the frontend
      return mapDbConfigToFrontend(data);
    } else {
      console.log('Inserting new config');
      // Insert new config
      const { data, error } = await supabase
        .from('shelly_configs')
        .insert(dbConfig)
        .select('*')
        .single();
      
      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }
      
      console.log('Insert successful, received data:', data);
      
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

    const { error } = await supabase
      .from('shelly_configs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting Shelly config:", error);
    return false;
  }
};

export const isShellyConfigValid = async (id?: string): Promise<boolean> => {
  try {
    const config = await getShellyConfig(id);
    return config.deviceId !== '' && config.serverUrl !== '' && config.apiKey !== '';
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

export const fetchShellyData = async (configId?: string): Promise<ShellyEMData | null> => {  
  const config = await getShellyConfig(configId);
  const url = await getShellyCloudUrl(configId);
  if (!url) {
    console.error('Shelly Cloud URL is not configured');
    throw new Error('Shelly Cloud URL is not configured');
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorMessage = `HTTP error! status: ${response.status}`;
      console.error('Failed to fetch Shelly data:', errorMessage);
      throw new Error(errorMessage);
    }
    
    // Check content type to ensure we're getting JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Received non-JSON response:', text.substring(0, 100) + '...');
      throw new Error('Server returned non-JSON response. Check your server URL configuration.');
    }
    
    const jsonResponse = await response.json() as ShellyEMResponse;
    console.log('Received Shelly data:', jsonResponse);
    
    if (!jsonResponse.isok || !jsonResponse.data || !jsonResponse.data.device_status) {
      console.error('Invalid Shelly response format');
      throw new Error('Invalid Shelly response format');
    }
    
    const deviceStatus = jsonResponse.data.device_status;
    const deviceType = config.deviceType || 'ShellyEM';
    console.log(`Processing data for device type: ${deviceType}`);
    
    // Add null checks for emeters array
    if (!deviceStatus.emeters || !Array.isArray(deviceStatus.emeters) || deviceStatus.emeters.length === 0) {
      console.error('No emeters data found in device status');
      throw new Error('No emeters data found in device status');
    }
    
    // Different processing based on device type
    let gridMeter, productionMeter;
    
    if (deviceType === 'ShellyProEM') {
      // Shelly Pro EM might have a different data structure
      // This is a placeholder for the specific processing logic
      console.log('Processing Shelly Pro EM data format');
      gridMeter = deviceStatus.emeters[0]; // Adjust based on actual Pro EM structure
      productionMeter = deviceStatus.emeters.length > 1 ? deviceStatus.emeters[1] : null;
    } else {
      // Default processing for Shelly EM
      console.log('Processing standard Shelly EM data format');
      gridMeter = deviceStatus.emeters[0]; // Grid meter is typically the first emeter
      productionMeter = deviceStatus.emeters.length > 1 ? deviceStatus.emeters[1] : null; // Production meter (if exists)
    }
    
    if (!gridMeter) {
      console.error('Grid meter data is missing');
      throw new Error('Grid meter data is missing');
    }
    
    // Transform the response into our ShellyEMData format
    // Parse the device's timestamp and preserve local timezone
    // Convert the device's timestamp to UTC to ensure consistent timezone handling
    const deviceDate = new Date(deviceStatus._updated + 'Z');
    const timestamp = deviceDate.getTime();

    const shellyData: ShellyEMData = {
      timestamp,
      power: gridMeter.power || 0,
      reactive: gridMeter.reactive || 0,
      production_power: productionMeter ? (productionMeter.power || 0) : 0,
      total_energy: gridMeter.total || 0,
      production_energy: productionMeter ? (productionMeter.total || 0) : 0,
      grid_returned: gridMeter.total_returned || 0,
      voltage: gridMeter.voltage || 0,
      current: 0, // Not directly available in the response
      pf: gridMeter.pf || 0,
      temperature: deviceStatus.temperature?.tC || 0,
      is_valid: gridMeter.is_valid || false,
      channel: 0
    };
    
    return shellyData;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch Shelly data';
    console.error('Error fetching Shelly data:', errorMessage);
    throw error;
  }
};

export const storeEnergyData = async (data: ShellyEMData, configId?: string): Promise<boolean> => {
  try {
    // Get the corresponding Shelly config to add its ID to the stored data
    const config = await getShellyConfig(configId);
    
    // Get the last stored record to compare values
    const { data: lastRecord, error: fetchError } = await supabase
      .from('energy_data')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching last record:', fetchError);
      return false;
    }

    // Ensure timestamp is a valid date
    let timestamp: string;
    if (typeof data.timestamp === 'number') {
      // Convert timestamp to UTC ISO string for Supabase
      const date = new Date(data.timestamp);
      timestamp = date.toISOString();
    } else {
      console.error('Invalid timestamp format:', data.timestamp);
      timestamp = new Date().toISOString(); // Use current time as fallback
    }

    // Compare current values with last stored values and check time threshold
    if (lastRecord && lastRecord.length > 0) {
      const last = lastRecord[0];
      const lastTimestamp = new Date(last.timestamp).getTime() / 1000;
      const currentTimestamp = data.timestamp;
      const timeDiff = currentTimestamp - lastTimestamp;
      
      // Skip if data is too recent (less than 30 seconds) or if all values are identical
      if (timeDiff < 30 || (
        last.consumption === data.power &&
        last.production === data.production_power &&
        last.grid_total === data.total_energy &&
        last.grid_total_returned === data.grid_returned &&
        last.production_total === data.production_energy
      )) {
        console.log('Skipping storage: data too recent or unchanged from last record');
        return true;
      }
    }

    // Prepare the data object to insert
    const dataToInsert = {
      timestamp,
      consumption: data.power,
      production: data.production_power,
      grid_total: data.total_energy,
      grid_total_returned: data.grid_returned,
      production_total: data.production_energy
    };
    
    // Only add shelly_config_id if config.id exists
    if (config.id) {
      console.log('Associating energy data with Shelly config ID:', config.id);
      dataToInsert['shelly_config_id'] = config.id;
    } else {
      console.log('No Shelly config ID available, storing data without association');
    }

    const { error } = await supabase
      .from('energy_data')
      .insert([dataToInsert]);
    
    if (error) {
      console.error('Error storing data in Supabase:', error);
      return false;
    }
    
    console.log('Successfully stored new energy data with timestamp:', timestamp);
    return true;
  } catch (error) {
    console.error('Failed to store data in Supabase:', error);
    return false;
  }
};
