
import { ChartDataPoint } from './types';
import { useCallback } from 'react';

export function useChartDomains(chartData: ChartDataPoint[]) {
  const calculateYAxisDomain = useCallback((showConsumption: boolean, showProduction: boolean, showGrid: boolean): [number, number] => {
    if (!chartData || chartData.length === 0) {
      return [-500, 3000] as [number, number];
    }
    
    const maxValue = Math.max(
      ...chartData.map(d => Math.max(
        showConsumption ? d.consumption : 0,
        showProduction ? d.production : 0,
        showGrid ? Math.abs(d.grid) : 0
      ))
    );
    
    const minValue = Math.min(
      ...chartData.map(d => Math.min(
        showGrid ? d.grid : 0
      ))
    );
    
    return [minValue < 0 ? 1.1 * minValue : -100, 1.1 * maxValue] as [number, number];
  }, [chartData]);

  const calculateVoltageYAxisDomain = useCallback((showVoltage: boolean): [number, number] => {
    if (!chartData || chartData.length === 0 || !showVoltage) {
      return [220, 240] as [number, number];
    }

    const voltageValues = chartData
      .map(d => d.voltage)
      .filter(v => v !== undefined) as number[];
    
    if (voltageValues.length === 0) {
      return [220, 240] as [number, number];
    }
    
    const minVoltage = Math.min(...voltageValues);
    const maxVoltage = Math.max(...voltageValues);
    
    const padding = (maxVoltage - minVoltage) * 0.1;
    return [
      Math.floor(minVoltage - padding), 
      Math.ceil(maxVoltage + padding)
    ] as [number, number];
  }, [chartData]);

  return { calculateYAxisDomain, calculateVoltageYAxisDomain };
}
