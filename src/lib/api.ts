
import { ShellyConfig, ShellyEMData } from './types';
import { supabase } from '@/integrations/supabase/client';

const SHELLY_CONFIG_KEY = 'shelly_config';

export const updateShellyConfig = (config: ShellyConfig): void => {
  localStorage.setItem(SHELLY_CONFIG_KEY, JSON.stringify(config));
};

const DEFAULT_CONFIG: ShellyConfig = {
  serverUrl: 'https://shelly-11-eu.shelly.cloud',
  deviceId: 'ecfabcc7ebe9',
  apiKey: 'MmIzYzJ1aWQ9E5B47CE0F300842AD58AEC918783E62DADA00AC1D88E8C28721C5CE356A11CA021A43DAE7AE96ED'
};

export const getShellyConfig = (): ShellyConfig => {
  const config = localStorage.getItem(SHELLY_CONFIG_KEY);
  if (!config) return DEFAULT_CONFIG;
  
  try {
    return JSON.parse(config);
  } catch (error) {
    return DEFAULT_CONFIG;
  }
};

export const isShellyConfigValid = (): boolean => {
  const config = getShellyConfig();
  return config.deviceId !== '' && config.serverUrl !== '' && config.apiKey !== '';
};

export const getShellyCloudUrl = (): string | null => {
  const config = getShellyConfig();
  if (!config) return null;
  return `${config.serverUrl}/device/status?id=${config.deviceId}&auth_key=${config.apiKey}`;
};

export const fetchShellyData = async (): Promise<ShellyEMData | null> => {  const url = getShellyCloudUrl();
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
    const gridMeter = deviceStatus.emeters[0]; // Grid meter is typically the first emeter
    const productionMeter = deviceStatus.emeters.length > 1 ? deviceStatus.emeters[1] : null; // Production meter (if exists)
    
    // Transform the response into our ShellyEMData format
    // Parse the device's timestamp and preserve local timezone
    // Convert the device's timestamp to UTC to ensure consistent timezone handling
    const deviceDate = new Date(deviceStatus._updated + 'Z');
    const timestamp = deviceDate.getTime();

    const shellyData: ShellyEMData = {
      timestamp,
      power: gridMeter.power,
      reactive: gridMeter.reactive,
      production_power: productionMeter ? productionMeter.power : 0,
      total_energy: gridMeter.total,
      production_energy: productionMeter ? productionMeter.total : 0,
      grid_returned: gridMeter.total_returned,
      voltage: gridMeter.voltage,
      current: 0, // Not directly available in the response
      pf: gridMeter.pf,
      temperature: deviceStatus.temperature?.tC || 0,
      is_valid: gridMeter.is_valid,
      channel: 0
    };
    
    return shellyData;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch Shelly data';
    console.error('Error fetching Shelly data:', errorMessage);
    throw error;
  }
};

export const storeEnergyData = async (data: ShellyEMData): Promise<boolean> => {
  try {
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

    const { error } = await supabase
      .from('energy_data')
      .insert([
        {
          timestamp,
          consumption: data.power,
          production: data.production_power,
          grid_total: data.total_energy,
          grid_total_returned: data.grid_returned,
          production_total: data.production_energy
        }
      ]);
    
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
