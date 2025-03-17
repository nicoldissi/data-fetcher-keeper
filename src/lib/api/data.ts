
import { supabase } from '@/integrations/supabase/client';
import { ShellyEMData } from '@/lib/types';
import { DailyTotals } from '@/hooks/useDailyEnergyTotals';
import { getShellyConfig } from '@/lib/api/config';

export async function getLatestData(configId: string): Promise<ShellyEMData | null> {
  if (!configId) return null;
  
  // Use the correct energy_data table instead of shelly_data
  const { data, error } = await supabase
    .from('energy_data')
    .select('*')
    .eq('shelly_config_id', configId)
    .order('timestamp', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching data:', error);
    return null;
  }

  if (data.length === 0) return null;
  
  // Map the data from Supabase to our ShellyEMData type
  const energyData = data[0];
  const timestamp = new Date(energyData.timestamp).getTime();
  
  const shellyData: ShellyEMData = {
    timestamp,
    power: energyData.consumption || 0,
    reactive: energyData.grid_reactive || 0,
    pf: energyData.grid_pf || 0,
    pv_power: energyData.production || 0,
    pv_reactive: energyData.pv_reactive || 0,
    pv_pf: energyData.pv_pf || 0,
    total_energy: energyData.grid_total || 0,
    pv_energy: energyData.production_total || 0,
    grid_returned: energyData.grid_total_returned || 0,
    voltage: energyData.voltage || 0,
    current: 0, // Not available in database
    temperature: 0, // Not available in database
    is_valid: true,
    channel: 0,
    shelly_config_id: configId,
    frequency: energyData.frequency || 0
  };

  return shellyData;
}

export async function getHistoricalData(
  configId: string, 
  startTime: string, 
  endTime: string
): Promise<ShellyEMData[]> {
  if (!configId) return [];
  
  // Use the correct energy_data table
  const { data, error } = await supabase
    .from('energy_data')
    .select('*')
    .eq('shelly_config_id', configId)
    .gte('timestamp', startTime)
    .lte('timestamp', endTime)
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('Error fetching historical data:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Map each row to our ShellyEMData type
  return data.map(row => {
    const timestamp = new Date(row.timestamp).getTime();
    
    return {
      timestamp,
      power: row.consumption || 0,
      reactive: row.grid_reactive || 0,
      pf: row.grid_pf || 0,
      pv_power: row.production || 0,
      pv_reactive: row.pv_reactive || 0,
      pv_pf: row.pv_pf || 0,
      total_energy: row.grid_total || 0,
      pv_energy: row.production_total || 0,
      grid_returned: row.grid_total_returned || 0,
      voltage: row.voltage || 0,
      current: 0,
      temperature: 0,
      is_valid: true,
      channel: 0,
      shelly_config_id: configId,
      frequency: row.frequency || 0
    } as ShellyEMData;
  });
}

export async function getDailyTotals(
  configId?: string,
  date?: string
): Promise<DailyTotals | null> {
  if (!configId) return null;
  
  const targetDate = date || new Date().toISOString().split('T')[0];
  console.log(`Fetching daily totals for date: ${targetDate}, configId: ${configId}`);
  
  // Since there's no daily_energy_totals table, we will aggregate the data from energy_data
  const startOfDay = `${targetDate}T00:00:00`;
  const endOfDay = `${targetDate}T23:59:59`;
  
  const { data, error } = await supabase
    .from('energy_data')
    .select('*')
    .eq('shelly_config_id', configId)
    .gte('timestamp', startOfDay)
    .lte('timestamp', endOfDay);

  if (error) {
    console.error('Error fetching daily totals:', error);
    return null;
  }

  if (!data || data.length === 0) {
    console.log('No data found for the specified date range');
    // Return default values if no data is found
    return {
      consumption: 0,
      importFromGrid: 0,
      injection: 0,
      production: 0,
      date: targetDate,
      config_id: configId
    };
  }

  console.log(`Found ${data.length} data points for daily totals calculation`);

  // Calculate values by average power * number of hours
  const hours = 24; // Full day
  const averageReadings = (array: any[], field: string) => {
    return array.reduce((sum, item) => sum + (Number(item[field]) || 0), 0) / array.length;
  };

  // Calculate average consumption (grid power)
  const avgConsumption = averageReadings(data, 'consumption');
  // Some consumption values can be negative (when injecting to grid)
  const avgImportFromGrid = data
    .filter(item => Number(item.consumption) > 0)
    .length > 0
    ? averageReadings(
        data.filter(item => Number(item.consumption) > 0),
        'consumption'
      )
    : 0;

  // Average production from PV
  const avgProduction = averageReadings(data, 'production');
  
  // Calculate injection to grid (negative consumption values represent injection)
  const avgInjection = data
    .filter(item => Number(item.consumption) < 0)
    .length > 0
    ? Math.abs(
        averageReadings(
          data.filter(item => Number(item.consumption) < 0),
          'consumption'
        )
      )
    : 0;
  
  // Convert from average power (W) to energy (Wh) by multiplying by hours
  const totalImportFromGrid = avgImportFromGrid * hours;
  const totalProduction = avgProduction * hours;
  const totalInjection = avgInjection * hours;
  const totalConsumption = totalImportFromGrid + (totalProduction - totalInjection);

  console.log('Calculated daily totals:', {
    consumption: totalConsumption,
    importFromGrid: totalImportFromGrid,
    injection: totalInjection,
    production: totalProduction,
    avgConsumption,
    avgImportFromGrid,
    avgProduction,
    avgInjection
  });

  return {
    consumption: totalConsumption,
    importFromGrid: totalImportFromGrid,
    injection: totalInjection,
    production: totalProduction,
    date: targetDate,
    config_id: configId
  };
}

// Define the database energy data interface
interface DbEnergyData {
  timestamp: string;
  consumption: number;
  production: number;
  grid_total: number;
  grid_total_returned: number;
  production_total: number;
  voltage: number;
  frequency: number;
  grid_pf: number;
  grid_reactive: number;
  pv_pf: number;
  pv_reactive: number;
  shelly_config_id: string;
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
    
    // Create a local date from the timestamp
    const timestamp = new Date(energyData.timestamp).getTime();
    
    const shellyData: ShellyEMData = {
      timestamp,
      power: energyData.consumption || 0,
      reactive: energyData.grid_reactive || 0,
      pf: energyData.grid_pf || 0,
      pv_power: energyData.production || 0,
      pv_reactive: energyData.pv_reactive || 0,
      pv_pf: energyData.pv_pf || 0,
      total_energy: energyData.grid_total || 0,
      pv_energy: energyData.production_total || 0,
      grid_returned: energyData.grid_total_returned || 0,
      voltage: energyData.voltage || 0,
      current: 0, // Not available in Supabase
      temperature: 0, // Not available in Supabase
      is_valid: true, // Assume data in Supabase is valid
      channel: 0, // Not available in Supabase
      shelly_config_id: configId,
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
    console.log('Attempting to store energy data in Supabase with configId:', configId);
    console.log('Data to store:', JSON.stringify(data, null, 2));
    
    // More strict configuration verification
    if (!configId) {
      console.error('ConfigId is missing for storeEnergyData');
      return false;
    }
    
    // Get the corresponding Shelly configuration to add its ID to the stored data
    const config = await getShellyConfig(configId);
    
    if (!config || !config.id) {
      console.error('Failed to get valid Shelly config for storage, config:', config);
      return false;
    }

    // Ensure the timestamp is a valid date
    let timestamp: string;
    if (typeof data.timestamp === 'number') {
      // Convert the timestamp to a UTC ISO string for Supabase
      const date = new Date(data.timestamp);
      timestamp = date.toISOString();
      console.log('Converted timestamp to ISO string:', timestamp);
    } else {
      console.error('Invalid timestamp format:', data.timestamp);
      timestamp = new Date().toISOString(); // Use current time as fallback
      console.log('Using current time as fallback for timestamp:', timestamp);
    }

    // Numeric data validation
    const validateNumber = (value: any, name: string): number => {
      if (typeof value !== 'number' || isNaN(value)) {
        console.warn(`Invalid ${name} value:`, value, 'using 0 instead');
        return 0;
      }
      return value;
    };

    // Prepare the data object to insert with numeric value validation
    const dataToInsert: DbEnergyData = {
      timestamp,
      consumption: validateNumber(data.power, 'power'),
      production: validateNumber(data.pv_power, 'pv_power'),
      grid_total: validateNumber(data.total_energy, 'total_energy'),
      grid_total_returned: validateNumber(data.grid_returned, 'grid_returned'),
      production_total: validateNumber(data.pv_energy, 'pv_energy'),
      voltage: validateNumber(data.voltage, 'voltage'),
      frequency: validateNumber(data.frequency, 'frequency'),
      grid_pf: validateNumber(data.pf, 'pf'),
      grid_reactive: validateNumber(data.reactive, 'reactive'),
      pv_pf: validateNumber(data.pv_pf, 'pv_pf'),
      pv_reactive: validateNumber(data.pv_reactive, 'pv_reactive'),
      shelly_config_id: config.id
    };

    console.log('Inserting data into Supabase:', JSON.stringify(dataToInsert, null, 2));

    // Attempt to insert the data with returning inserted data for verification
    const { error, data: insertedData } = await supabase
      .from('energy_data')
      .insert([dataToInsert])
      .select();

    if (error) {
      console.error('Error storing data in Supabase:', error);
      
      // Additional check for table access
      try {
        console.log('Testing table access...');
        const { data: testData, error: testError } = await supabase
          .from('energy_data')
          .select('id')
          .limit(1);
          
        if (testError) {
          console.error('Test query also failed, possible permission issue:', testError);
        } else {
          console.log('Table access test succeeded, returned:', testData);
        }
      } catch (testErr) {
        console.error('Exception during table access test:', testErr);
      }
      
      return false;
    }

    console.log('Successfully stored new energy data:', insertedData);
    return true;
  } catch (error) {
    console.error('Failed to store data in Supabase:', error);
    return false;
  }
};
