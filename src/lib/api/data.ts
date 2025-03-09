
import { ShellyEMData } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { getShellyConfig } from './config';

// Interface pour la représentation des données énergétiques dans la base de données
interface DbEnergyData {
    id?: number;
    timestamp: string;
    consumption: number;          // Consommation du réseau (grid)
    production: number;           // Production solaire (pv)
    grid_total: number;           // Énergie totale consommée du réseau
    grid_total_returned: number;  // Énergie totale retournée au réseau
    production_total: number;     // Énergie totale produite
    shelly_config_id?: string;
    created_at?: string;
    voltage?: number;
    frequency?: number;
    
    // Champs uniformisés
    pf?: number;                  // Facteur de puissance pour le réseau (grid)
    reactive?: number;            // Puissance réactive pour le réseau (grid)
    pv_pf?: number;               // Facteur de puissance pour le solaire (pv)
    pv_reactive?: number;         // Puissance réactive pour le solaire (pv)
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
      reactive: energyData.reactive || 0,
      pv_power: energyData.production || 0,
      pv_reactive: energyData.pv_reactive || 0,
      total_energy: energyData.grid_total || 0,
      pv_energy: energyData.production_total || 0,
      grid_returned: energyData.grid_total_returned || 0,
      voltage: energyData.voltage || 0,
      current: 0, // Non disponible dans Supabase
      pf: energyData.pf || 0,
      pv_pf: energyData.pv_pf || 0,
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
    // Obtenir la configuration Shelly correspondante pour ajouter son ID aux données stockées
    const config = await getShellyConfig(configId);

    // Récupérer le dernier enregistrement stocké pour comparer les valeurs
    const { data: lastRecord, error: fetchError } = await supabase
      .from('energy_data')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching last record:', fetchError);
      return false;
    }

    // S'assurer que le timestamp est une date valide
    let timestamp: string;
    if (typeof data.timestamp === 'number') {
      // Convertir le timestamp en chaîne ISO UTC pour Supabase
      const date = new Date(data.timestamp);
      timestamp = date.toISOString();
    } else {
      console.error('Invalid timestamp format:', data.timestamp);
      timestamp = new Date().toISOString(); // Utiliser l'heure actuelle comme fallback
    }

    // Comparer les valeurs actuelles avec les dernières valeurs stockées et vérifier le seuil de temps
    if (lastRecord && lastRecord.length > 0) {
      const last = lastRecord[0];
      const lastTimestamp = new Date(last.timestamp).getTime() / 1000;
      const currentTimestamp = data.timestamp;
      const timeDiff = currentTimestamp - lastTimestamp;

      // Ignorer si les données sont trop récentes (moins de 30 secondes) ou si toutes les valeurs sont identiques
      if (timeDiff < 30 || (
        last.consumption === data.power &&
        last.production === data.pv_power &&
        last.grid_total === data.total_energy &&
        last.grid_total_returned === data.grid_returned &&
        last.production_total === data.pv_energy &&
        last.pf === data.pf &&
        last.reactive === data.reactive &&
        last.pv_pf === data.pv_pf &&
        last.pv_reactive === data.pv_reactive
      )) {
        console.log('Skipping storage: data too recent or unchanged from last record');
        return true;
      }
    }

    // Préparer l'objet de données à insérer
    const dataToInsert: DbEnergyData = {
      timestamp,
      consumption: data.power,
      production: data.pv_power,
      grid_total: data.total_energy,
      grid_total_returned: data.grid_returned,
      production_total: data.pv_energy,
      voltage: data.voltage,
      frequency: data.frequency,
      pf: data.pf,
      reactive: data.reactive,
      pv_pf: data.pv_pf,
      pv_reactive: data.pv_reactive
    };

    // Ajouter shelly_config_id uniquement si config.id existe
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
