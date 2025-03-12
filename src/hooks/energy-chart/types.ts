
import { ShellyEMData } from '@/lib/types';

export interface ChartDataPoint {
  time: string;
  timestamp: number;
  consumption: number;
  production: number;
  grid: number;
  voltage?: number;
  clearSkyProduction?: number;
}

export interface UseEnergyChartResult {
  chartData: ChartDataPoint[];
  isLoadingFullDay: boolean;
  calculateYAxisDomain: (showConsumption: boolean, showProduction: boolean, showGrid: boolean) => [number, number];
  calculateVoltageYAxisDomain: (showVoltage: boolean) => [number, number];
}

export interface ClearSkyDataPoint {
  timestamp: string;
  power: number;
}

export interface EnergyChartDependencies {
  history: ShellyEMData[];
  configId: string | null;
}
