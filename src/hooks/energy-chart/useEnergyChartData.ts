
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
      
      // Log each clear sky data point for debugging
      console.log('Clear sky data points:');
      clearSkyData.forEach((point, index) => {
        console.log(`Point ${index}: timestamp=${new Date(point.timestamp).toISOString()}, power=${point.power}`);
      });
      
      const updatedData = fullDayData.map(point => {
        const pointDate = new Date(point.timestamp);
        
        // Find the matching clear sky point for this time without rounding
        const matchingPoint = clearSkyData.find(csPoint => {
          const csDate = new Date(csPoint.timestamp);
          return csDate.getTime() === pointDate.getTime();
        });
        
        if (matchingPoint) {
          console.log(`Match found for ${pointDate.toISOString()}: clearSkyProduction=${matchingPoint.power}`);
        }
        
        return {
          ...point,
          clearSkyProduction: matchingPoint?.power
        };
      });
      
      // Count how many points have clearSkyProduction values
      const pointsWithClearSky = updatedData.filter(d => d.clearSkyProduction !== undefined).length;
      console.log(`Updated chart data: ${updatedData.length} total points, ${pointsWithClearSky} with clear sky values`);
      
      setChartData(updatedData);
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
        
        if (matchingPoint) {
          console.log(`Initial data: Match found for ${localDate.toISOString()}: clearSkyProduction=${matchingPoint.power}`);
        }
        
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

      // Count how many points have clearSkyProduction values
      const pointsWithClearSky = transformedData.filter(d => d.clearSkyProduction !== undefined).length;
      console.log(`Initial chart data: ${transformedData.length} total points, ${pointsWithClearSky} with clear sky values`);
      
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
