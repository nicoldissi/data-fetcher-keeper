
import { useState, useEffect } from 'react';
import { ShellyEMData } from '@/lib/types';
import { formatLocalDate } from '@/lib/dateUtils';
import { ChartDataPoint, UseEnergyChartResult, ClearSkyDataPoint } from './types';
import { useClearSkyData } from './useClearSkyData';
import { useRealtimeEnergyData } from './useRealtimeEnergyData';
import { useChartDomains } from './chartDomainUtils';

export function useEnergyChartData(history: ShellyEMData[], configId: string | null): UseEnergyChartResult {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const clearSkyData = useClearSkyData(configId);
  const { fullDayData, isLoadingFullDay } = useRealtimeEnergyData(configId);
  const { calculateYAxisDomain, calculateVoltageYAxisDomain } = useChartDomains(chartData);

  // Apply clear sky data to chart data points
  useEffect(() => {
    if (clearSkyData.length > 0 && fullDayData.length > 0) {
      console.log('Applying clear sky data to chart. Clear sky points:', clearSkyData.length);
      
      const updatedData = fullDayData.map(point => {
        const pointDate = new Date(point.timestamp);
        
        // Find the matching clear sky point for this time without rounding
        const matchingPoint = clearSkyData.find(csPoint => {
          const csDate = new Date(csPoint.timestamp);
          return csDate.getTime() === pointDate.getTime();
        });
        
        return {
          ...point,
          clearSkyProduction: matchingPoint?.power
        };
      });
      
      setChartData(updatedData);
      console.log('Updated chart data with clear sky production values');
    }
  }, [clearSkyData, fullDayData]);

  // Process initial history data when fullDayData is not yet loaded
  useEffect(() => {
    if (history.length > 0 && fullDayData.length === 0) {
      const transformedData: ChartDataPoint[] = history.map((item: ShellyEMData) => {
        const formattedTime = formatLocalDate(item.timestamp, {
          hour: '2-digit', 
          minute: '2-digit',
          day: undefined,
          month: undefined,
          hour12: false
        });
        
        const localDate = new Date(item.timestamp);
        
        const grid = Math.round(item.power);
        const production = Math.round(item.pv_power || 0);
        const consumption = grid + production;

        // Find matching clear sky data without any time rounding
        const matchingPoint = clearSkyData.find(csPoint => {
          const csDate = new Date(csPoint.timestamp);
          return csDate.getTime() === localDate.getTime();
        });
        
        return {
          time: formattedTime,
          timestamp: localDate.getTime(),
          consumption,
          production,
          grid,
          voltage: item.voltage ? Math.round(item.voltage * 10) / 10 : undefined,
          clearSkyProduction: matchingPoint?.power
        };
      });

      setChartData(transformedData);
    }
  }, [history, fullDayData.length, clearSkyData]);

  return {
    chartData,
    isLoadingFullDay,
    calculateYAxisDomain,
    calculateVoltageYAxisDomain
  };
}
