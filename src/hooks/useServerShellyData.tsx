import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ShellyEMData, ShellyConfig } from '@/lib/types';
import { toast } from '@/components/ui/use-toast';
import { useState, useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';

interface FetchShellyDataResponse {
  data: ShellyEMData[] | null;
  error: string | null;
}

// Add development mode check at the top of the file
const isDevelopment = process.env.NODE_ENV === 'development';

const debugLog = (message: string, ...args: unknown[]) => {
  if (isDevelopment) {
    console.log(message, ...args);
  }
};

export const useServerShellyData = (config: ShellyConfig | null) => {
  const [history, setHistory] = useState<ShellyEMData[]>([]);
  const [lastStored, setLastStored] = useState<ShellyEMData | null>(null);
  const [totalFetches, setTotalFetches] = useState(0);
  const [totalStored, setTotalStored] = useState(0);
  const [isConfigValid, setIsConfigValid] = useState<boolean>(false);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  // Cache management
  const cacheTimeoutRef = useRef<number>(30000); // 30 seconds cache
  const lastFetchTimeRef = useRef<number>(0);

  // Pagination management
  const [page, setPage] = useState<number>(1);
  const pageSize = 50; // Limit the number of records per page

  // Keep the previous data to compare against
  const previousDataRef = useRef<ShellyEMData | null>(null);

  useEffect(() => {
    if (config && isDevelopment) {
      debugLog('useServerShellyData - Config changed:', config.id);
    }

    if ((config?.deviceId || config?.deviceid) &&
        (config?.apiKey || config?.apikey) &&
        (config?.serverUrl || config?.serverurl) &&
        (config?.id)) {
      if (isDevelopment) {
        debugLog('useServerShellyData - Config is valid, setting up realtime subscription');
      }
      setIsConfigValid(true);

      const channel = supabase
        .channel(`energy_data_changes_${config.id}`)
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'energy_data',
            filter: `shelly_config_id=eq.${config.id}`
          },
          (payload) => {
            const newData = payload.new as ShellyEMData;
            if (newData && newData.shelly_config_id === config.id) {
              setHistory(prev => {
                const newHistory = [...prev, newData];
                return newHistory.slice(-pageSize); // Use pageSize instead of hardcoded value
              });
              previousDataRef.current = newData;
            }
          }
        )
        .subscribe();

      realtimeChannelRef.current = channel;
    } else if (config === null) {
      // Don't log during initial render with null config
    } else {
      if (isDevelopment) {
        debugLog('useServerShellyData - Config is invalid or incomplete');
      }
      setIsConfigValid(false);
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.unsubscribe();
      }
    }

    return () => {
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.unsubscribe();
      }
    };
  }, [config]);

  const fetchShellyData = async (): Promise<FetchShellyDataResponse> => {
    if (!config) {
      return { data: null, error: 'No Shelly device configured' };
    }

    // Check cache before fetching
    const now = Date.now();
    if (now - lastFetchTimeRef.current < cacheTimeoutRef.current) {
      return { data: history, error: null };
    }
    lastFetchTimeRef.current = now;

    if (isDevelopment) {
      debugLog('useServerShellyData - Fetching data for config:', config.id);
    }

    try {
      const { data, error } = await supabase.functions.invoke('fetch-shelly-data', {
        body: {
          configId: config.id
        }
      });

      if (error) {
        console.error('useServerShellyData - Error fetching Shelly data:', error);
        return { data: null, error: error.message };
      }

      setTotalFetches(prev => prev + 1);

      if (data && data.stored) {
        setTotalStored(prev => prev + 1);
        const shellyData = data.data;
        setLastStored(shellyData);
        previousDataRef.current = shellyData;
        if (isDevelopment) {
          debugLog('useServerShellyData - Data stored successfully');
        }
        return { data: [shellyData], error: null };
      }

      return { data: data.data as ShellyEMData[], error: null };
    } catch (error) {
      let errorMessage = 'Failed to fetch data';
      if (error instanceof Error) {
          errorMessage = error.message;
      }
      console.error('useServerShellyData - Failed to fetch Shelly data:', error);
      return { data: null, error: errorMessage };
    }
  };

  const queryResult: UseQueryResult<FetchShellyDataResponse> = useQuery({
    queryKey: ['serverShellyData', config?.deviceId || config?.deviceid],
    queryFn: fetchShellyData,
    enabled: !!(config?.deviceId || config?.deviceid) &&
             !!(config?.apiKey || config?.apikey) &&
             !!(config?.serverUrl || config?.serverurl),
    refetchInterval: 5000, // Refresh every 5 seconds
    retry: 3,
    staleTime: 0, // Always consider data stale to ensure real-time updates
    // cacheTime: 0, // Remove cacheTime
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
    meta: {
      onError: (error: unknown) => { // Use unknown here
        if (error instanceof Error) {
          toast({
            variant: "destructive",
            title: "Error fetching data",
            description: error.message || "Failed to fetch Shelly data",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Error fetching data",
            description: "An unknown error occurred", // Handle non-Error errors
          });
        }
      }
    }
  });
  
  // Update history when new data is received
  useEffect(() => {
     if (queryResult.data?.data && queryResult.data.data.length > 0) {
      if (isDevelopment) {
        debugLog('useServerShellyData - New query data received');
      }
      setHistory((prev) => {
        const newHistory = [...prev, ...(queryResult.data?.data || [])];
        return newHistory.slice(-pageSize);
      });
    }
    }, [queryResult.data]);

  // Calculate statistics based on the data
  const stats = {
    totalFetches,
    totalStored,
    successRate: totalFetches > 0 ? Math.round((totalStored / totalFetches) * 100) : 0
  };

  const result = {
    ...queryResult,
    currentData: queryResult.data?.data?.[0] || null,
    history,
    lastStored,
    stats,
    isConfigValid
  };

  // Only log essential information about the result in development mode
  if (isDevelopment && (result.currentData || result.isLoading || result.error)) {
    debugLog('useServerShellyData - Status update:', {
      hasCurrentData: !!result.currentData,
      isLoading: result.isLoading,
      hasError: !!result.error,
      historyLength: result.history.length
    });
  }

  return result;
};