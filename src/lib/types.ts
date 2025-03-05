
export interface ShellyEMData {
  id?: string;
  timestamp: number;
  power: number;
  reactive:number;          // Current power consumption in Watts (grid)
  production_power: number; // Solar production power in Watts
  total_energy: number;   // Total energy consumed in Watt-hours
  production_energy: number; // Total energy produced in Watt-hours
  grid_returned: number;  // Total energy returned to grid in Watt-hours
  voltage: number;        // Current voltage (V)
  current: number;        // Current amperage (A)
  pf: number;             // Power factor
  temperature: number;    // Device temperature
  is_valid: boolean;      // Whether the reading is valid
  channel: number;        // Which channel (0 or 1) the data comes from
}

export interface ShellyEMResponse {
  isok: boolean;
  data: {
    online: boolean;
    device_status: {
      _updated: string;   // Device update time in format 'YYYY-MM-DD HH:mm:ss'
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
