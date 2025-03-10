
export interface ShellyEMData {
  id?: string;
  timestamp: number;
  power: number;                // Consommation du réseau (grid) en Watts
  reactive: number;             // Puissance réactive pour le réseau (grid)
  pf: number;                   // Facteur de puissance pour le réseau (grid)
  
  pv_power: number;             // Production solaire en Watts
  pv_reactive: number;          // Puissance réactive pour le solaire
  pv_pf: number;                // Facteur de puissance pour le solaire
  
  total_energy: number;         // Énergie totale consommée en Watt-heures
  pv_energy: number;            // Énergie totale produite en Watt-heures
  grid_returned: number;        // Énergie totale retournée au réseau en Watt-heures
  voltage: number;              // Tension actuelle (V)
  current: number;              // Intensité actuelle (A)
  temperature: number;          // Température de l'appareil
  is_valid: boolean;            // Validité de la lecture
  channel: number;              // Canal (0 ou 1) d'où proviennent les données
  shelly_config_id?: string;    // ID de la configuration du dispositif Shelly
  frequency?: number;           // Fréquence actuelle (Hz)
}

export interface ShellyEMResponse {
  isok: boolean;
  data: {
    online: boolean;
    device_status: {
      _updated: string;   // Heure de mise à jour du dispositif au format 'YYYY-MM-DD HH:mm:ss'
      temperature?: {
        tC: number;
      };
      emeters: Array<{
        power: number;
        reactive: number;
        voltage: number;
        total: number;
        pf: number;
        is_valid: boolean;
        total_returned: number;
      }>;
    };
  };
}

export interface ShellyConfig {
  // Frontend property names (camelCase)
  deviceId?: string;
  apiKey?: string;
  serverUrl?: string;
  name?: string;
  id?: string;
  user_id?: string;
  deviceType?: 'ShellyEM' | 'ShellyProEM';
  
  // Database field mappings - snake_case format from Supabase
  deviceid?: string;
  apikey?: string;
  serverurl?: string;
  device_type?: string;
}
