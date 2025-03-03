
import { ShellyEMData, ShellyEMResponse } from './types';

// The URL of your Shelly EM device - this should be updated by the user
const SHELLY_EM_URL = 'http://shellyem.local/status';

/**
 * Fetches data from a Shelly EM device
 * @returns Processed Shelly EM data
 */
export const fetchShellyEMData = async (): Promise<ShellyEMData> => {
  try {
    // In a real environment, you might need to handle CORS issues
    // You might need to setup a proxy server or use a CORS proxy
    const response = await fetch(SHELLY_EM_URL);
    
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
