import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ShellyEMData, ShellyConfig } from '@/lib/types';
import { toast } from '@/components/ui/use-toast';

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

  // Load device configuration
  useEffect(() => {
    const fetchDeviceConfig = async () => {
      if (!configId) {
        setError('No device configuration ID provided');
        setIsLoading(false);
        return;
      }

      try {
        // Get device configuration from Supabase
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

        // Map database fields to frontend format
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

  // Load initial data and set up real-time subscription
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!configId) {
        setError('No device configuration ID provided');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Get the latest energy data for this device
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
          
          // Also get recent history data
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
      // Check if we should fetch new data based on cache duration
      const now = Date.now();
      if (now - lastFetchTimeRef.current < CACHE_DURATION) {
        return; // Use cached data
      }

      try {
        // Get the energy data history for this device (last 24 hours)
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const { data, error } = await supabase
          .from('energy_data')
          .select('*')
          .eq('shelly_config_id', configId)
          .gte('timestamp', twentyFourHoursAgo.toISOString())
          .order('timestamp', { ascending: true })
          .limit(100); // Adjust based on your needs

        if (error) throw error;

        if (data && data.length > 0) {
          const historyData = data.map(mapDbToShellyEMData);
          setHistory(historyData);
          lastFetchTimeRef.current = now;
        }
      } catch (err) {
        console.error('Error loading history data:', err);
        // Don't set error state for history data to avoid disrupting the UI
      }
    };

    // Subscribe to real-time updates
    const setupRealtimeSubscription = () => {
      if (!configId) return;
      
      // Clean up any existing channel
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
            console.log('Received real-time data update:', payload);
            const newData = mapDbToShellyEMData(payload.new);
            
            // Update current data
            setCurrentData(newData);
            
            // Add to history
            setHistory(prev => {
              const newHistory = [...prev, newData];
              // Keep most recent 100 entries
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

    // Initial data load
    fetchInitialData();
    
    // Set up real-time subscription
    setupRealtimeSubscription();
    
    // Periodically refresh history data
    const historyInterval = setInterval(fetchHistoryData, CACHE_DURATION);

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      clearInterval(historyInterval);
    };
  }, [configId]);

  // Helper function to map database record to ShellyEMData
  const mapDbToShellyEMData = (record: any): ShellyEMData => {
    return {
      timestamp: new Date(record.timestamp).getTime(),
      power: record.consumption || 0,
      reactive: 0, // Not always available in database
      production_power: record.production || 0,
      total_energy: record.grid_total || 0,
      production_energy: record.production_total || 0,
      grid_returned: record.grid_total_returned || 0,
      voltage: record.voltage || 0,
      current: 0, // Not available in database
      pf: 0, // Not available in database
      temperature: 0, // Not available in database
      is_valid: true, // Assume data in database is valid
      channel: 0, // Not available in database
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
