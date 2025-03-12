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
      console.log('Applying smoother clear sky data to chart. Clear sky points:', clearSkyData.length);
      
      const updatedData = fullDayData.map(point => {
        const pointDate = new Date(point.timestamp);
        const roundedMinutes = Math.floor(pointDate.getMinutes() / 15) * 15;
        pointDate.setMinutes(roundedMinutes, 0, 0);
        
        // Find the matching clear sky point for this time
        const matchingPoint = clearSkyData.find(csPoint => {
          const csDate = new Date(csPoint.timestamp);
          return csDate.getHours() === pointDate.getHours() && 
                 Math.abs(csDate.getMinutes() - pointDate.getMinutes()) < 2;
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
        
        // Ensure timestamp is correctly handled for local time
        const localDate = new Date(item.timestamp);
        
        const grid = Math.round(item.power);
        const production = Math.round(item.pv_power || 0);
        const consumption = grid + production;

        // Find matching clear sky data for this timestamp
        let matchingClearSkyPoint = null;
        
        if (clearSkyData.length > 0) {
          // Find the closest clear sky point based on hour and minute
          let minDiff = Infinity;
          let closestPoint = null;
          
          for (const csPoint of clearSkyData) {
            const csTime = new Date(csPoint.timestamp);
            
            // Compare hours and minutes directly
            const localHour = localDate.getHours();
            const localMinute = localDate.getMinutes();
            const csHour = csTime.getHours();
            const csMinute = csTime.getMinutes();
            
            // Calculate difference in minutes
            const hourDiff = Math.abs(csHour - localHour);
            const minuteDiff = Math.abs(csMinute - localMinute);
            const totalMinutesDiff = (hourDiff * 60) + minuteDiff;
            
            if (totalMinutesDiff < minDiff) {
              minDiff = totalMinutesDiff;
              closestPoint = csPoint;
            }
          }
          
          matchingClearSkyPoint = closestPoint;
        }
        
        return {
          time: formattedTime,
          timestamp: localDate.getTime(),
          consumption,
          production,
          grid,
          voltage: item.voltage ? Math.round(item.voltage * 10) / 10 : undefined,
          clearSkyProduction: matchingClearSkyPoint?.power
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
