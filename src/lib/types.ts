
export interface ShellyEMData {
  id?: string;
  timestamp: number;
  power: number;          // Current power consumption in Watts
  total_energy: number;   // Total energy in Watt-hours
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
  deviceId: string;
  apiKey: string;
}
