
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ShellyEMData, ShellyConfig } from '@/lib/types';
import { toast } from '@/components/ui/use-toast';
import { parseToLocalDate } from '@/lib/dateUtils';

export function useSupabaseRealtime(configId?: string) {
  const [currentData, setCurrentData] = useState<ShellyEMData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ShellyEMData[]>([]);
  const [deviceConfig, setDeviceConfig] = useState<ShellyConfig | null>(null);
  const [isConfigValid, setIsConfigValid] = useState<boolean>(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const CACHE_DURATION = 60000; // 60 seconds

  useEffect(() => {
    const fetchDeviceConfig = async () => {
      if (!configId) {
        setError('No device configuration ID provided');
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('shelly_configs')
          .select('*')
          .eq('id', configId)
          .single();

        if (error) throw error;

        if (!data) {
          setError('Device configuration not found');
          setIsConfigValid(false);
          setIsLoading(false);
          return;
        }

        const config: ShellyConfig = {
          id: data.id,
          deviceId: data.deviceid,
          apiKey: data.apikey,
          serverUrl: data.serverurl,
          name: data.name,
          deviceType: (data.device_type as 'ShellyEM' | 'ShellyProEM') || 'ShellyEM'
        };

        setDeviceConfig(config);
        setIsConfigValid(true);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error loading device configuration';
        console.error(errorMessage, err);
        setError(errorMessage);
        setIsConfigValid(false);
      }
    };

    fetchDeviceConfig();
  }, [configId]);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!configId) {
        setError('No device configuration ID provided');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('energy_data')
          .select('*')
          .eq('shelly_config_id', configId)
          .order('timestamp', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          const latestData = mapDbToShellyEMData(data[0]);
          setCurrentData(latestData);
          
          fetchHistoryData();
        } else {
          console.log('No data found for device');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error loading energy data';
        console.error(errorMessage, err);
        setError(errorMessage);
        toast({
          variant: "destructive",
          title: "Failed to fetch data",
          description: errorMessage
        });
      } finally {
        setIsLoading(false);
      }
    };

    const fetchHistoryData = async () => {
      const now = Date.now();
      if (now - lastFetchTimeRef.current < CACHE_DURATION) {
        return;
      }

      try {
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const { data, error } = await supabase
          .from('energy_data')
          .select('*')
          .eq('shelly_config_id', configId)
          .gte('timestamp', twentyFourHoursAgo.toISOString())
          .order('timestamp', { ascending: true })
          .limit(100);

        if (error) throw error;

        if (data && data.length > 0) {
          const historyData = data.map(mapDbToShellyEMData);
          setHistory(historyData);
          lastFetchTimeRef.current = now;
        }
      } catch (err) {
        console.error('Error loading history data:', err);
      }
    };

    const setupRealtimeSubscription = () => {
      if (!configId) return;
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      
      const channel = supabase
        .channel('energy-data-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'energy_data',
            filter: `shelly_config_id=eq.${configId}`
          },
          (payload) => {
            const newData = mapDbToShellyEMData(payload.new);
            
            setCurrentData(newData);
            
            setHistory(prev => {
              const newHistory = [...prev, newData];
              return newHistory.slice(-100);
            });
          }
        )
        .subscribe((status) => {
          console.log(`Realtime subscription status: ${status}`);
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to real-time updates');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Error subscribing to real-time updates');
          }
        });
      
      channelRef.current = channel;
    };

    fetchInitialData();
    
    setupRealtimeSubscription();
    
    const historyInterval = setInterval(fetchHistoryData, CACHE_DURATION);

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      clearInterval(historyInterval);
    };
  }, [configId]);

  const mapDbToShellyEMData = (record: any): ShellyEMData => {
    const timestamp = parseToLocalDate(record.timestamp).getTime();
    
    return {
      timestamp,
      power: record.consumption || 0,
      reactive: record.reactive || 0,
      pv_power: record.production || 0,          // Renommé de production_power à pv_power
      pv_reactive: record.pv_reactive || 0,      // Renommé de production_reactive à pv_reactive
      total_energy: record.grid_total || 0,
      pv_energy: record.production_total || 0,   // Renommé de production_energy à pv_energy
      grid_returned: record.grid_total_returned || 0,
      voltage: record.voltage || 0,
      current: 0, // Non stocké dans la base de données
      pf: record.pf || 0,
      pv_pf: record.pv_pf || 0,                  // Renommé de production_pf à pv_pf
      temperature: 0, // Non stocké dans la base de données
      is_valid: true,
      channel: 0,
      shelly_config_id: configId,
      frequency: record.frequency || 0
    };
  };

  return {
    currentData,
    isLoading,
    error,
    history,
    deviceConfig,
    isConfigValid,
    stats: {
      totalFetches: history.length,
      totalStored: history.length
    }
  };
}
