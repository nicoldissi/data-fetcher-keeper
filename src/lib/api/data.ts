
import { ShellyEMData } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { getShellyConfig } from './config';

// Interface for database representation of EnergyData
interface DbEnergyData {
    id?: number;
    timestamp: string;
    consumption: number;
    production: number;
    grid_total: number;
    grid_total_returned: number;
    production_total: number;
    shelly_config_id?: string;
    created_at?: string;
    voltage?: number;
    frequency?: number;
    pf?: number;
    reactive?: number;
}

export const fetchShellyData = async (configId?: string): Promise<ShellyEMData | null> => {
  try {
    if (!configId) {
      console.error('configId is undefined in fetchShellyData');
      return null;
    }

    console.log('Fetching data for Shelly config ID:', configId);

    const { data, error } = await supabase
      .from('energy_data')
      .select('*')
      .eq('shelly_config_id', configId)
      .order('timestamp', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching Shelly data from Supabase:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn('No Shelly data found in Supabase for configId:', configId);
      return null;
    }

    console.log('Retrieved data for Shelly config ID:', configId, 'Data:', data[0]);

    // Map Supabase data to ShellyEMData format
    const energyData = data[0];
    
    // Créer une date locale à partir du timestamp
    const timestamp = new Date(energyData.timestamp).getTime();
    
    const shellyData: ShellyEMData = {
      timestamp,
      power: energyData.consumption || 0,
      reactive: energyData.reactive || 0, // Maintenant disponible dans Supabase
      production_power: energyData.production || 0,
      total_energy: energyData.grid_total || 0,
      production_energy: energyData.production_total || 0,
      grid_returned: energyData.grid_total_returned || 0,
      voltage: energyData.voltage || 0,
      current: 0, // Not available in Supabase
      pf: energyData.pf || 0, // Maintenant disponible dans Supabase
      temperature: 0, // Not available in Supabase
      is_valid: true, // Assuming data in Supabase is valid
      channel: 0, // Not available in Supabase
      shelly_config_id: configId, // Add the config ID to ensure proper tracking
      frequency: energyData.frequency || 0
    };

    return shellyData;
  } catch (error) {
    console.error('Error fetching Shelly data:', error);
    return null;
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
        last.production_total === data.production_energy &&
        last.pf === data.pf &&
        last.reactive === data.reactive
      )) {
        console.log('Skipping storage: data too recent or unchanged from last record');
        return true;
      }
    }

    // Prepare the data object to insert
    const dataToInsert: DbEnergyData = {
      timestamp,
      consumption: data.power,
      production: data.production_power,
      grid_total: data.total_energy,
      grid_total_returned: data.grid_returned,
      production_total: data.production_energy,
      voltage: data.voltage,
      frequency: data.frequency,
      pf: data.pf,
      reactive: data.reactive
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
