
import { useState } from 'react';
import { ShellyEMData } from '@/lib/types';
import { EnergyChartWithDateSelector } from '@/components/charts/EnergyChartWithDateSelector';

interface HistoricalEnergyChartProps {
  history: ShellyEMData[];
  configId?: string | null;
}

export function HistoricalEnergyChart({ history, configId }: HistoricalEnergyChartProps) {
  return (
    <EnergyChartWithDateSelector 
      history={history} 
      configId={configId}
    />
  );
}

export default HistoricalEnergyChart;
