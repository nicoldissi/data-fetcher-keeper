import { supabase } from '@/integrations/supabase/client';
import { ShellyEMData } from '@/lib/types';
import { DailyTotals } from '@/hooks/useDailyEnergyTotals';

export async function getLatestData(configId: string): Promise<ShellyEMData | null> {
  if (!configId) return null;
  
  const { data, error } = await supabase
    .from('shelly_data')
    .select('*')
    .eq('config_id', configId)
    .order('timestamp', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching data:', error);
    return null;
  }

  return data.length > 0 ? data[0] as ShellyEMData : null;
}

export async function getHistoricalData(
  configId: string, 
  startTime: string, 
  endTime: string
): Promise<ShellyEMData[]> {
  if (!configId) return [];
  
  const { data, error } = await supabase
    .from('shelly_data')
    .select('*')
    .eq('config_id', configId)
    .gte('timestamp', startTime)
    .lte('timestamp', endTime)
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('Error fetching historical data:', error);
    return [];
  }

  return data as ShellyEMData[];
}

export async function getDailyTotals(
  configId?: string,
  date?: string
): Promise<DailyTotals | null> {
  if (!configId) return null;
  
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('daily_energy_totals')
    .select('*')
    .eq('config_id', configId)
    .eq('date', targetDate)
    .limit(1);

  if (error) {
    console.error('Error fetching daily totals:', error);
    return null;
  }

  return data.length > 0 ? data[0] as DailyTotals : null;
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
      reactive: energyData.grid_reactive || 0, // Corriger pour utiliser grid_reactive
      pf: energyData.grid_pf || 0, // Corriger pour utiliser grid_pf
      pv_power: energyData.production || 0,
      pv_reactive: energyData.pv_reactive || 0,
      pv_pf: energyData.pv_pf || 0,
      total_energy: energyData.grid_total || 0,
      pv_energy: energyData.production_total || 0,
      grid_returned: energyData.grid_total_returned || 0,
      voltage: energyData.voltage || 0,
      current: 0, // Non disponible dans Supabase
      temperature: 0, // Non disponible dans Supabase
      is_valid: true, // On suppose que les données dans Supabase sont valides
      channel: 0, // Non disponible dans Supabase
      shelly_config_id: configId, // Ajouter l'ID de config pour assurer un suivi approprié
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
    
    // Vérification plus stricte de la configuration
    if (!configId) {
      console.error('ConfigId is missing for storeEnergyData');
      return false;
    }
    
    // Obtenir la configuration Shelly correspondante pour ajouter son ID aux données stockées
    const config = await getShellyConfig(configId);
    
    if (!config || !config.id) {
      console.error('Failed to get valid Shelly config for storage, config:', config);
      return false;
    }

    // S'assurer que le timestamp est une date valide
    let timestamp: string;
    if (typeof data.timestamp === 'number') {
      // Convertir le timestamp en chaîne ISO UTC pour Supabase
      const date = new Date(data.timestamp);
      timestamp = date.toISOString();
      console.log('Converted timestamp to ISO string:', timestamp);
    } else {
      console.error('Invalid timestamp format:', data.timestamp);
      timestamp = new Date().toISOString(); // Utiliser l'heure actuelle comme fallback
      console.log('Using current time as fallback for timestamp:', timestamp);
    }

    // Vérification des données numériques
    const validateNumber = (value: any, name: string): number => {
      if (typeof value !== 'number' || isNaN(value)) {
        console.warn(`Invalid ${name} value:`, value, 'using 0 instead');
        return 0;
      }
      return value;
    };

    // Préparer l'objet de données à insérer avec validation des valeurs numériques
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

    // Tenter d'insérer les données avec retour des données insérées pour vérification
    const { error, data: insertedData } = await supabase
      .from('energy_data')
      .insert([dataToInsert])
      .select();

    if (error) {
      console.error('Error storing data in Supabase:', error);
      
      // Vérification supplémentaire de l'accès à la table
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
