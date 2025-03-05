import { useState, useEffect, useRef } from 'react';
import { ShellyEMData } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export function useServerShellyData(configId?: string, pollingInterval = 5000) {
  const [currentData, setCurrentData] = useState<ShellyEMData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastStored, setLastStored] = useState<ShellyEMData | null>(null);
  const [history, setHistory] = useState<ShellyEMData[]>([]);
  const [isConfigValid, setIsConfigValid] = useState<boolean>(false);
  
  // Keep track of the fetch and store counts
  const [totalFetches, setTotalFetches] = useState(0);
  const [totalStored, setTotalStored] = useState(0);

  // Use useRef to handle component unmounting
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Check if the user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Authentication required');
        setIsLoading(false);
        return false;
      }
      return true;
    };
    
    checkAuth();
  }, []);
  
  // Main data fetching effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const fetchData = async () => {
      try {
        // Get the current session for the authentication token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (isMountedRef.current) {
            setError('Authentication required');
            setIsLoading(false);
          }
          return;
        }
        
        if (isMountedRef.current) {
          setIsLoading(true);
        }
        
        // Call the edge function to fetch data
        const { data, error } = await supabase.functions.invoke('fetch-shelly-data', {
          body: { configId },
        });
        
        if (error) {
          throw new Error(error.message);
        }
        
        if (!isMountedRef.current) return;
        
        if (data.error) {
          if (data.error.includes('Configuration not found')) {
            setIsConfigValid(false);
            setError('Shelly device not configured');
          } else {
            setError(data.error);
          }
          setIsLoading(false);
          return;
        }
        
        setIsConfigValid(true);
        setTotalFetches(prev => prev + 1);
        setCurrentData(data.data);
        
        if (data.stored) {
          setTotalStored(prev => prev + 1);
          setLastStored(data.data);
          
          // Add to history (keeping the last 100 readings)
          setHistory(prev => {
            const newHistory = [...prev, data.data];
            return newHistory.slice(-100);
          });
        }
        
        setError(null);
      } catch (err) {
        if (!isMountedRef.current) return;
        
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('Error fetching Shelly data:', errorMessage);
        setError(errorMessage);
        toast({
          variant: "destructive",
          title: "Failed to fetch data",
          description: errorMessage
        });
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };
    
    // Initial fetch
    fetchData();
    
    // Set up interval for polling
    interval = setInterval(fetchData, pollingInterval);
    
    // Cleanup
    return () => {
      clearInterval(interval);
    };
  }, [configId, pollingInterval]);
  
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
