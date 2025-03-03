import { ShellyEMData, ShellyEMResponse, ShellyConfig } from './types';
import { createClient } from '@supabase/supabase-js';

// Default empty config - will be populated by user input
let shellyConfig: ShellyConfig = {
  deviceId: '',
  apiKey: ''
};

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Updates the Shelly device configuration
 * @param config New Shelly configuration
 */
export const updateShellyConfig = (config: ShellyConfig) => {
  shellyConfig = config;
  localStorage.setItem('shellyConfig', JSON.stringify(config));
  console.log('Shelly configuration updated:', config);
};

/**
 * Loads Shelly configuration from localStorage
 * @returns True if configuration was loaded successfully
 */
export const loadShellyConfig = (): boolean => {
  const savedConfig = localStorage.getItem('shellyConfig');
  if (savedConfig) {
    try {
      shellyConfig = JSON.parse(savedConfig);
      console.log('Loaded Shelly configuration:', shellyConfig);
      return true;
    } catch (e) {
      console.error('Failed to parse saved Shelly configuration:', e);
      return false;
    }
  }
  return false;
};

/**
 * Checks if Shelly configuration is valid
 * @returns True if configuration has deviceId and apiKey
 */
export const isShellyConfigValid = (): boolean => {
  return !!(shellyConfig.deviceId && shellyConfig.apiKey);
};

/**
 * Gets the Shelly cloud API URL
 * @returns URL for the Shelly cloud API
 */
const getShellyCloudUrl = (): string => {
  return `https://shelly-11-eu.shelly.cloud/device/status?id=${shellyConfig.deviceId}&auth_key=${shellyConfig.apiKey}`;
};

/**
 * Fetches data from a Shelly EM device via cloud API
 * @returns Processed Shelly EM data array for both channels
 */
export const fetchShellyEMData = async (): Promise<ShellyEMData> => {
  if (!isShellyConfigValid()) {
    console.error('Shelly configuration is not valid');
    return {
      timestamp: Date.now(),
      power: 0,
      production_power: 0,
      total_energy: 0,
      production_energy: 0,
      grid_returned: 0,
      voltage: 0,
      current: 0,
      pf: 0,
      temperature: 0,
      is_valid: false,
      channel: 0
    };
  }

  try {
    console.log('Fetching data from Shelly API:', getShellyCloudUrl());
    const response = await fetch(getShellyCloudUrl());
    
    if (!response.ok) {
      throw new Error(`Error fetching Shelly EM data: ${response.statusText}`);
    }
    
    const jsonData = await response.json() as ShellyEMResponse;
    console.log('Received data from Shelly API:', jsonData);
    
    if (!jsonData.isok || !jsonData.data || !jsonData.data.device_status || !jsonData.data.device_status.emeters) {
      throw new Error('Invalid data format received from Shelly API');
    }
    
    // Channel 0: Grid consumption/injection
    const gridMeter = jsonData.data.device_status.emeters[0];
    // Channel 1: Solar production
    const productionMeter = jsonData.data.device_status.emeters.length > 1 
      ? jsonData.data.device_status.emeters[1] 
      : { power: 0, total: 0, is_valid: false, pf: 0, voltage: gridMeter.voltage, total_returned: 0 };
    
    const temperature = jsonData.data.device_status.temperature?.tC || 0;
    
    return {
      timestamp: Date.now(),
      power: gridMeter.power, // Grid power (negative means injection to grid)
      production_power: productionMeter.power, // Solar production power
      total_energy: gridMeter.total, // Total energy consumed from grid
      production_energy: productionMeter.total, // Total energy produced by solar
      grid_returned: gridMeter.total_returned, // Total energy returned to grid
      voltage: gridMeter.voltage,
      current: Math.abs(gridMeter.power / gridMeter.voltage), // Calculate current as P/V
      pf: gridMeter.pf,
      temperature: temperature,
      is_valid: jsonData.data.online && gridMeter.is_valid,
      channel: 0
    };
  } catch (error) {
    console.error('Failed to fetch Shelly EM data:', error);
    
    // Return a fallback data structure with is_valid = false
    return {
      timestamp: Date.now(),
      power: 0,
      production_power: 0,
      total_energy: 0,
      production_energy: 0,
      grid_returned: 0,
      voltage: 0,
      current: 0,
      pf: 0,
      temperature: 0,
      is_valid: false,
      channel: 0
    };
  }
};

/**
 * Stores energy data in Supabase
 * @param data ShellyEM data to store
 * @returns Success indicator
 */
export const storeEnergyData = async (data: ShellyEMData): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('energy_data')
      .insert([
        {
          timestamp: new Date(data.timestamp).toISOString(),
          power: data.power,
          production_power: data.production_power,
          total_energy: data.total_energy,
          production_energy: data.production_energy,
          grid_returned: data.grid_returned,
          voltage: data.voltage,
          current: data.current,
          temperature: data.temperature,
          pf: data.pf
        }
      ]);
    
    if (error) {
      console.error('Error storing data in Supabase:', error);
      return false;
    }
    
    console.log('Data stored in Supabase successfully');
    return true;
  } catch (error) {
    console.error('Failed to store data:', error);
    return false;
  }
};

/**
 * Determines if a reading is different enough from the previous one to be stored
 * @param previous Previous ShellyEMData object
 * @param current Current ShellyEMData object
 * @returns True if data is different
 */
export const isDataDifferent = (previous: ShellyEMData | null, current: ShellyEMData): boolean => {
  if (!previous) return true;
  
  // Consider a reading different if power changes by more than 5W or energy by 0.01 kWh
  const powerDifferent = Math.abs(previous.power - current.power) > 5;
  const energyDifferent = Math.abs(previous.total_energy - current.total_energy) > 0.01;
  
  return powerDifferent || energyDifferent;
};
