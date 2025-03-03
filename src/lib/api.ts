
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
 * @returns Processed Shelly EM data
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
      is_valid: false
    };
  }

  try {
    const response = await fetch(getShellyCloudUrl());
    
    if (!response.ok) {
      throw new Error(`Error fetching Shelly EM data: ${response.statusText}`);
    }
    
    const data: ShellyEMResponse = await response.json();
    
    return {
      timestamp: Date.now(),
      power: data.emeter.power,
      total_energy: data.emeter.total,
      voltage: data.emeter.voltage,
      current: data.emeter.current,
      pf: data.emeter.pf,
      temperature: data.temperature.tC,
      is_valid: data.online
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
      is_valid: false
    };
  }
};

// This is a placeholder function for storing data in Supabase
// It will be replaced with actual Supabase integration when connected
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
