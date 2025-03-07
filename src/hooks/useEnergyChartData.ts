
import { useEffect, useState, useCallback } from 'react';
import { ShellyEMData } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

// Define the type for the chart data points
export interface ChartDataPoint {
  time: string;
  timestamp: number;
  consumption: number;
  production: number;
  grid: number;
  voltage?: number;
}

export function useEnergyChartData(history: ShellyEMData[], configId: string | null) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [fullDayData, setFullDayData] = useState<ChartDataPoint[]>([]);
  const [isLoadingFullDay, setIsLoadingFullDay] = useState(false);
  
  // Fetch full day data from Supabase
  useEffect(() => {
    const fetchFullDayData = async () => {
      if (!configId) return;
      
      setIsLoadingFullDay(true);
      
      try {
        // Get start of the current day in local time, then convert to ISO for the query
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfDay = today.toISOString();
        
        console.log('Fetching full day data since:', startOfDay);
        
        const { data, error } = await supabase
          .from('energy_data')
          .select('*')
          .eq('shelly_config_id', configId)
          .gte('timestamp', startOfDay)
          .order('timestamp', { ascending: true });
          
        if (error) throw error;
        
        console.log(`Fetched ${data?.length || 0} data points for the full day`);
        
        if (data && data.length > 0) {
          // Transform the data for the chart
          const transformedData: ChartDataPoint[] = data.map((item: any) => {
            // Parse the timestamp correctly
            const date = new Date(item.timestamp);
            
            // Ensure consumption = grid + production with positive values
            const grid = Math.round(item.consumption || 0);
            const production = Math.round(item.production || 0);
            const consumption = grid + production;
            
            return {
              // Format time directly in local timezone
              time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
              timestamp: date.getTime(),
              consumption,
              production,
              grid,
              voltage: item.voltage ? Math.round(item.voltage * 10) / 10 : undefined // Round to 1 decimal place if available
            };
          });
          
          setFullDayData(transformedData);
        }
      } catch (err) {
        console.error('Error fetching full day data:', err);
      } finally {
        setIsLoadingFullDay(false);
      }
    };
    
    fetchFullDayData();
  }, [configId]);

  // Use both sources of data
  useEffect(() => {
    if (fullDayData.length > 0) {
      // Use the full day data if available
      setChartData(fullDayData);
    } else if (history.length > 0) {
      // Fall back to the history prop if full day data isn't ready
      const transformedData: ChartDataPoint[] = history.map((item: ShellyEMData) => {
        // Use browser's built-in time formatting for local timezone display
        const date = new Date(item.timestamp);
        
        // Ensure consumption = grid + production
        const grid = Math.round(item.power);
        const production = Math.round(item.production_power || 0);
        const consumption = grid + production;
        
        return {
          // Use native browser date formatting to ensure local timezone
          time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          timestamp: date.getTime(),
          consumption,
          production,
          grid,
          voltage: item.voltage ? Math.round(item.voltage * 10) / 10 : undefined // Round to 1 decimal place if available
        };
      });

      setChartData(transformedData);
    }
  }, [history, fullDayData]);

  // Calculate Y-axis domains
  const calculateYAxisDomain = useCallback((showConsumption: boolean, showProduction: boolean, showGrid: boolean) => {
    if (chartData.length === 0) {
      return [-500, 3000]; // Default if no data
    }
    
    // Find max value based on which lines are shown
    const maxValue = Math.max(
      ...chartData.map(d => Math.max(
        showConsumption ? d.consumption : 0,
        showProduction ? d.production : 0,
        showGrid ? Math.abs(d.grid) : 0
      ))
    );
    
    // Find min value (for grid which can be negative)
    const minValue = Math.min(
      ...chartData.map(d => Math.min(
        showGrid ? d.grid : 0
      ))
    );
    
    // Add 10% padding to max and min for better visualization
    return [minValue < 0 ? 1.1 * minValue : -100, 1.1 * maxValue];
  }, [chartData]);

  // Calculate voltage Y-axis domain
  const calculateVoltageYAxisDomain = useCallback((showVoltage: boolean) => {
    if (chartData.length === 0 || !showVoltage) {
      return [220, 240]; // Default voltage range if no data
    }

    const voltageValues = chartData
      .map(d => d.voltage)
      .filter(v => v !== undefined) as number[];
    
    if (voltageValues.length === 0) {
      return [220, 240]; // Default if no voltage data
    }
    
    const minVoltage = Math.min(...voltageValues);
    const maxVoltage = Math.max(...voltageValues);
    
    // Add small padding for better visualization
    const padding = (maxVoltage - minVoltage) * 0.1;
    return [
      Math.floor(minVoltage - padding), 
      Math.ceil(maxVoltage + padding)
    ];
  }, [chartData]);

  return {
    chartData,
    isLoadingFullDay,
    calculateYAxisDomain,
    calculateVoltageYAxisDomain
  };
}
