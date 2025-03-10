
import { useState, useEffect, useRef } from 'react';
import { ShellyEMData } from '@/lib/types';
import { fetchShellyData, storeEnergyData, isShellyConfigValid } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useShellyData(configId?: string, pollingInterval = 5000) {
  const [currentData, setCurrentData] = useState<ShellyEMData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastStored, setLastStored] = useState<ShellyEMData | null>(null);
  const [history, setHistory] = useState<ShellyEMData[]>([]);
  const [isConfigValid, setIsConfigValid] = useState<boolean>(false);
  
  // Keep the previous data to compare against
  const previousDataRef = useRef<ShellyEMData | null>(null);
  
  // Statistics
  const [totalFetches, setTotalFetches] = useState(0);
  const [totalStored, setTotalStored] = useState(0);

  // Load configuration on mount
  useEffect(() => {
    const checkConfigValid = async () => {
      const valid = await isShellyConfigValid(configId);
      setIsConfigValid(valid);
    };
    
    checkConfigValid();
  }, [configId]);
  
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      // Skip fetching if configuration is not valid
      const configValid = await isShellyConfigValid(configId);
      
      if (!configValid) {
        if (isMounted) {
          setIsConfigValid(false);
          setError('Shelly device not configured');
          setIsLoading(false);
        }
        return;
      }

      if (isMounted) {
        setIsConfigValid(true);
      }
      
      try {
        if (isMounted) {
          setIsLoading(true);
        }
        
        const data = await fetchShellyData(configId);
        
        if (!isMounted) return;
        
        setTotalFetches(prev => prev + 1);
        setCurrentData(data);
        
        // Only store data if it's valid and different from the previous stored data
        if (data && (!previousDataRef.current ||
            data.power !== previousDataRef.current.power ||
            data.pv_power !== previousDataRef.current.pv_power ||
            data.total_energy !== previousDataRef.current.total_energy ||
            data.grid_returned !== previousDataRef.current.grid_returned ||
            data.pv_energy !== previousDataRef.current.pv_energy ||
            data.timestamp !== previousDataRef.current.timestamp
          )) {
          const stored = await storeEnergyData(data, configId);
          
          if (stored) {
            setTotalStored(prev => prev + 1);
            setLastStored(data);
            previousDataRef.current = data;
            
            // Add to history (keeping the last 100 readings)
            setHistory(prev => {
              const newHistory = [...prev, data];
              return newHistory.slice(-100);
            });
          }
        }
        
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        toast({
          variant: "destructive",
          title: "Failed to fetch data",
          description: errorMessage
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, pollingInterval);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [pollingInterval, configId]);

  return {
    currentData,
    isLoading,
    error,
    lastStored,
    history,
    isConfigValid,
    stats: {
      totalFetches,
      totalStored
    }
  };
}
