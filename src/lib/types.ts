
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
}

export interface ShellyEMResponse {
  emeter: {
    power: number;
    total: number;
    voltage: number;
    current: number;
    pf: number;
  };
  temperature: {
    tC: number;
  };
  online: boolean;
}

export interface ShellyConfig {
  deviceId: string;
  apiKey: string;
}
