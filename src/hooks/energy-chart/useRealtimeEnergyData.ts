
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChartDataPoint } from './types';
import { formatLocalDate, parseToLocalDate, getMidnightToday } from '@/lib/dateUtils';

export function useRealtimeEnergyData(configId: string | null) {
  const [fullDayData, setFullDayData] = useState<ChartDataPoint[]>([]);
  const [isLoadingFullDay, setIsLoadingFullDay] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  // Set up real-time subscription
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
          
          // Throttle updates to reduce rendering load - only update every 30 seconds
          const now = Date.now();
          if (now - lastUpdateTimeRef.current < 30000) {
            console.log('Skipping update due to throttling');
            return;
          }
          
          lastUpdateTimeRef.current = now;
          
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

  // Fetch full-day data
  useEffect(() => {
    const fetchFullDayData = async () => {
      if (!configId) return;
      
      setIsLoadingFullDay(true);
      
      try {
        // Utiliser minuit du jour en cours
        const startOfDay = getMidnightToday().toISOString();
        
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
    
    // Reduce the frequency of full data refreshes from 15 minutes to 30 minutes
    const intervalId = setInterval(fetchFullDayData, 30 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [configId]);

  return { fullDayData, isLoadingFullDay, setFullDayData };
}
