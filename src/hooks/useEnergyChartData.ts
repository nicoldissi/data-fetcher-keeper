
import { useEffect, useState, useCallback, useRef } from 'react';
import { ShellyEMData } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { formatLocalDate, parseToLocalDate } from '@/lib/dateUtils';

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
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  useEffect(() => {
    if (!configId) return;
    
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    
    const channel = supabase
      .channel('energy-chart-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'energy_data',
          filter: `shelly_config_id=eq.${configId}`
        },
        (payload) => {
          console.log('Energy chart received real-time update:', payload);
          
          const newDataPoint = payload.new;
          if (!newDataPoint) return;
          
          const formattedTime = formatLocalDate(newDataPoint.timestamp, { 
            hour: '2-digit', 
            minute: '2-digit',
            day: undefined,
            month: undefined,
            hour12: false
          });
          
          const localDate = parseToLocalDate(newDataPoint.timestamp);
          
          const grid = Math.round(newDataPoint.consumption || 0);
          const production = Math.round(newDataPoint.production || 0);
          const consumption = grid + production;
          
          const chartPoint: ChartDataPoint = {
            time: formattedTime,
            timestamp: localDate.getTime(),
            consumption,
            production,
            grid,
            voltage: newDataPoint.voltage ? Math.round(newDataPoint.voltage * 10) / 10 : undefined
          };
          
          setChartData(prevData => {
            if (!prevData || prevData.length === 0) {
              return [chartPoint];
            }
            
            const existingIndex = prevData.findIndex(item => 
              item && item.timestamp === chartPoint.timestamp
            );
            
            if (existingIndex >= 0) {
              const newData = [...prevData];
              newData[existingIndex] = chartPoint;
              return newData;
            } else {
              const newData = [...prevData, chartPoint].sort((a, b) => a.timestamp - b.timestamp);
              return newData.slice(-100);
            }
          });
          
          setFullDayData(prevData => {
            if (!prevData || prevData.length === 0) {
              return [chartPoint];
            }
            
            const existingIndex = prevData.findIndex(item => 
              item && item.timestamp === chartPoint.timestamp
            );
            
            if (existingIndex >= 0) {
              const newData = [...prevData];
              newData[existingIndex] = chartPoint;
              return newData;
            } else {
              const newData = [...prevData, chartPoint].sort((a, b) => a.timestamp - b.timestamp);
              return newData;
            }
          });
        }
      )
      .subscribe((status) => {
        console.log(`Energy chart real-time subscription status: ${status}`);
      });
    
    channelRef.current = channel;
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [configId]);
  
  useEffect(() => {
    const fetchFullDayData = async () => {
      if (!configId) return;
      
      setIsLoadingFullDay(true);
      
      try {
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
          const transformedData: ChartDataPoint[] = data.map((item: any) => {
            const formattedTime = formatLocalDate(item.timestamp, { 
              hour: '2-digit', 
              minute: '2-digit',
              day: undefined,
              month: undefined,
              hour12: false
            });
            
            const localDate = parseToLocalDate(item.timestamp);
            
            const grid = Math.round(item.consumption || 0);
            const production = Math.round(item.production || 0);
            const consumption = grid + production;
            
            return {
              time: formattedTime,
              timestamp: localDate.getTime(),
              consumption,
              production,
              grid,
              voltage: item.voltage ? Math.round(item.voltage * 10) / 10 : undefined
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

  useEffect(() => {
    if (fullDayData.length > 0) {
      setChartData(fullDayData);
    } else if (history.length > 0) {
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
        
        return {
          time: formattedTime,
          timestamp: localDate.getTime(),
          consumption,
          production,
          grid,
          voltage: item.voltage ? Math.round(item.voltage * 10) / 10 : undefined
        };
      });

      setChartData(transformedData);
    }
  }, [history, fullDayData]);

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

  return {
    chartData,
    isLoadingFullDay,
    calculateYAxisDomain,
    calculateVoltageYAxisDomain
  };
}
