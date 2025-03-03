
import { ShellyEMData, ShellyEMResponse, ShellyConfig } from './types';

// Default empty config - will be populated by user input
let shellyConfig: ShellyConfig = {
  deviceId: '',
  apiKey: ''
};

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
      total_energy: 0,
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
    
    // For simplicity, we'll use the first meter data (channel 0)
    // You can modify this to return both channels if needed
    const emeter = jsonData.data.device_status.emeters[0];
    const temperature = jsonData.data.device_status.temperature?.tC || 0;
    
    return {
      timestamp: Date.now(),
      power: emeter.power,
      total_energy: emeter.total,
      voltage: emeter.voltage,
      current: Math.abs(emeter.power / emeter.voltage), // Calculate current as P/V
      pf: emeter.pf,
      temperature: temperature,
      is_valid: jsonData.data.online && emeter.is_valid,
      channel: 0
    };
  } catch (error) {
    console.error('Failed to fetch Shelly EM data:', error);
    
    // Return a fallback data structure with is_valid = false
    return {
      timestamp: Date.now(),
      power: 0,
      total_energy: 0,
      voltage: 0,
      current: 0,
      pf: 0,
      temperature: 0,
      is_valid: false,
      channel: 0
    };
  }
};

// This function will be updated to store data in Supabase
export const storeEnergyData = async (data: ShellyEMData): Promise<boolean> => {
  try {
    console.log('Would store data in Supabase:', data);
    // When Supabase is connected, this will be replaced with actual storage logic
    return true;
  } catch (error) {
    console.error('Failed to store data:', error);
    return false;
  }
};

// Determines if a reading is different enough from the previous one to be stored
export const isDataDifferent = (previous: ShellyEMData | null, current: ShellyEMData): boolean => {
  if (!previous) return true;
  
  // Consider a reading different if power changes by more than 5W or energy by 0.01 kWh
  const powerDifferent = Math.abs(previous.power - current.power) > 5;
  const energyDifferent = Math.abs(previous.total_energy - current.total_energy) > 0.01;
  
  return powerDifferent || energyDifferent;
};
