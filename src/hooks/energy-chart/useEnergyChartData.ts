
import { useState, useEffect } from 'react';
import { ShellyEMData } from '@/lib/types';
import { formatLocalDate, parseToLocalDate } from '@/lib/dateUtils';
import { ChartDataPoint, UseEnergyChartResult, ClearSkyDataPoint } from './types';
import { useClearSkyData } from './useClearSkyData';
import { useRealtimeEnergyData } from './useRealtimeEnergyData';
import { useChartDomains } from './chartDomainUtils';

export function useEnergyChartData(history: ShellyEMData[], configId: string | null): UseEnergyChartResult {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const clearSkyData = useClearSkyData(configId);
  const { fullDayData, isLoadingFullDay } = useRealtimeEnergyData(configId);
  const { calculateYAxisDomain, calculateVoltageYAxisDomain } = useChartDomains(chartData);

  // Create a unified timestamp format for better matching
  const formatTimestampForMatching = (timestamp: string | number): string => {
    const date = new Date(timestamp);
    return date.toISOString().split(':').slice(0, 2).join(':'); // Format to "YYYY-MM-DDTHH:MM"
  };

  // Fonction pour filtrer les données entre minuit et l'heure actuelle
  const filterDataByTimeRange = (dataArray: ChartDataPoint[]): ChartDataPoint[] => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0); // Minuit aujourd'hui
    
    return dataArray.filter(point => {
      const pointDate = new Date(point.timestamp);
      return pointDate >= today && pointDate <= now;
    });
  };

  // Apply clear sky data to chart data points
  useEffect(() => {
    if (clearSkyData.length > 0 && fullDayData.length > 0) {
      console.log('Applying clear sky data to chart. Clear sky points:', clearSkyData.length);
      
      // Create a map of clear sky data by timestamp for easier lookup
      const clearSkyMap = new Map<string, number>();
      
      clearSkyData.forEach((point) => {
        const formattedTimestamp = formatTimestampForMatching(point.timestamp);
        clearSkyMap.set(formattedTimestamp, point.power);
      });
      
      console.log(`Created clear sky map with ${clearSkyMap.size} entries`);
      
      const updatedData = fullDayData.map(point => {
        // Get timestamp as number from the point object
        const pointTimestamp = point.timestamp;
        const formattedPointTimestamp = formatTimestampForMatching(pointTimestamp);
        const clearSkyValue = clearSkyMap.get(formattedPointTimestamp);
        
        if (clearSkyValue !== undefined) {
          console.log(`Match found for ${new Date(point.timestamp).toISOString()}: clearSkyProduction=${clearSkyValue}`);
        }
        
        return {
          ...point,
          clearSkyProduction: clearSkyValue
        };
      });
      
      // Now, we need to add missing data points that exist in clearSkyData but not in fullDayData
      const existingTimestamps = new Set(updatedData.map(point => formatTimestampForMatching(point.timestamp)));
      const additionalPoints: ChartDataPoint[] = [];
      
      // Pour la production idéale (clearSky), on continue à afficher toutes les heures de la journée
      const now = new Date();
      clearSkyData.forEach(clearSkyPoint => {
        const formattedTimestamp = formatTimestampForMatching(clearSkyPoint.timestamp);
        const clearSkyDate = new Date(clearSkyPoint.timestamp);
        
        if (!existingTimestamps.has(formattedTimestamp)) {
          console.log(`Adding missing clear sky point for ${new Date(clearSkyPoint.timestamp).toISOString()}`);
          
          // Convert the timestamp to a number if it's a string
          const timestampNumber = typeof clearSkyPoint.timestamp === 'string' 
            ? new Date(clearSkyPoint.timestamp).getTime() 
            : clearSkyPoint.timestamp;
          
          const date = new Date(timestampNumber);
          const formattedTime = formatLocalDate(timestampNumber, {
            hour: '2-digit', 
            minute: '2-digit',
            day: undefined, 
            month: undefined,
            hour12: false
          });
          
          additionalPoints.push({
            time: formattedTime,
            timestamp: date.getTime(),
            consumption: 0,
            production: 0,
            grid: 0,
            clearSkyProduction: clearSkyPoint.power
          });
        }
      });
      
      // Combine and sort all data points
      const combinedData = [...updatedData, ...additionalPoints].sort((a, b) => a.timestamp - b.timestamp);
      
      // Filter data between midnight and now (except for clear sky data which is shown for the full day)
      const filteredData = filterDataByTimeRange(combinedData);
      
      // Count how many points have clearSkyProduction values
      const pointsWithClearSky = filteredData.filter(d => d.clearSkyProduction !== undefined).length;
      console.log(`Updated chart data: ${filteredData.length} total points, ${pointsWithClearSky} with clear sky values`);
      
      setChartData(filteredData);
    }
  }, [clearSkyData, fullDayData]);

  // Process initial history data when fullDayData is not yet loaded
  useEffect(() => {
    if (history.length > 0 && fullDayData.length === 0) {
      // Create a map of clear sky data by timestamp for easier lookup
      const clearSkyMap = new Map<string, number>();
      
      clearSkyData.forEach((point) => {
        const formattedTimestamp = formatTimestampForMatching(point.timestamp);
        clearSkyMap.set(formattedTimestamp, point.power);
      });
      
      const transformedData: ChartDataPoint[] = history.map((item: ShellyEMData) => {
        const formattedTime = formatLocalDate(item.timestamp, {
          hour: '2-digit', 
          minute: '2-digit',
          day: undefined,
          month: undefined,
          hour12: false
        });
        
        // Use the timestamp directly for formatting
        const formattedPointTimestamp = formatTimestampForMatching(item.timestamp);
        
        const grid = Math.round(item.power);
        const production = Math.round(item.pv_power || 0);
        const consumption = grid + production;
        
        // Find matching clear sky data using the map
        const clearSkyValue = clearSkyMap.get(formattedPointTimestamp);
        
        if (clearSkyValue !== undefined) {
          console.log(`Initial data: Match found for ${new Date(item.timestamp).toISOString()}: clearSkyProduction=${clearSkyValue}`);
        }
        
        return {
          time: formattedTime,
          timestamp: new Date(item.timestamp).getTime(),
          consumption,
          production,
          grid,
          voltage: item.voltage ? Math.round(item.voltage * 10) / 10 : undefined,
          clearSkyProduction: clearSkyValue
        };
      });

      // Now, add missing data points that exist in clearSkyData but not in history
      const existingTimestamps = new Set(transformedData.map(point => formatTimestampForMatching(point.timestamp)));
      const additionalPoints: ChartDataPoint[] = [];
      
      clearSkyData.forEach(clearSkyPoint => {
        const formattedTimestamp = formatTimestampForMatching(clearSkyPoint.timestamp);
        
        if (!existingTimestamps.has(formattedTimestamp)) {
          // Convert the timestamp to a number if it's a string
          const timestampNumber = typeof clearSkyPoint.timestamp === 'string'
            ? new Date(clearSkyPoint.timestamp).getTime()
            : clearSkyPoint.timestamp;
            
          const date = new Date(timestampNumber);
          const formattedTime = formatLocalDate(timestampNumber, {
            hour: '2-digit', 
            minute: '2-digit',
            day: undefined, 
            month: undefined,
            hour12: false
          });
          
          additionalPoints.push({
            time: formattedTime,
            timestamp: date.getTime(),
            consumption: 0,
            production: 0,
            grid: 0,
            clearSkyProduction: clearSkyPoint.power
          });
        }
      });
      
      // Combine and sort all data points
      const combinedData = [...transformedData, ...additionalPoints].sort((a, b) => a.timestamp - b.timestamp);

      // Filter data between midnight and now
      const filteredData = filterDataByTimeRange(combinedData);

      // Count how many points have clearSkyProduction values
      const pointsWithClearSky = filteredData.filter(d => d.clearSkyProduction !== undefined).length;
      console.log(`Initial chart data: ${filteredData.length} total points, ${pointsWithClearSky} with clear sky values`);
      
      setChartData(filteredData);
    }
  }, [history, fullDayData.length, clearSkyData]);

  return {
    chartData,
    isLoadingFullDay,
    calculateYAxisDomain,
    calculateVoltageYAxisDomain
  };
}
