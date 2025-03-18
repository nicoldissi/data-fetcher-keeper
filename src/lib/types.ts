
export interface ShellyEMData {
  timestamp: number;
  power: number;
  reactive: number;
  pv_power: number;
  pv_reactive: number;
  total_energy: number;
  pv_energy: number;
  grid_returned: number;
  voltage: number;
  current: number;
  pf: number;
  pv_pf: number;
  temperature: number;
  is_valid: boolean;
  channel: number;
  frequency: number;
  shelly_config_id?: string;
}

export interface ShellyConfig {
  id?: string;
  deviceId: string;
  apiKey: string;
  serverUrl: string;
  name?: string;
  deviceType?: 'ShellyEM' | 'ShellyProEM';
  inverter_power_kva?: number;
  grid_subscription_kva?: number;
  latitude?: number;
  longitude?: number;
  inverse_meters?: boolean;
}
