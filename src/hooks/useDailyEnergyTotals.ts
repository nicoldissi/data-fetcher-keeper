
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay } from 'date-fns';
import { shouldFetchData } from '@/lib/dataUtils';

interface DailyTotals {
  consumption: number;
  production: number;
  injection: number;
  importFromGrid: number; // Nouvelle propriété pour l'énergie importée du réseau
}

interface DailyDataPoint {
  timestamp: string;
  consumption: number;
  production: number;
  grid_total: number;
  grid_total_returned: number;
  production_total: number;
}

export function useDailyEnergyTotals(configId?: string) {
  const [dailyTotals, setDailyTotals] = useState<DailyTotals>({ 
    consumption: 0, 
    production: 0, 
    injection: 0,
    importFromGrid: 0
  });
  const [dailyData, setDailyData] = useState<DailyDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const CACHE_DURATION = 60000; // 60 seconds cache to reduce database load

  useEffect(() => {
    const fetchDailyTotals = async () => {
      // Check if we should fetch new data based on cache duration
      if (!shouldFetchData(lastFetchTimeRef.current, CACHE_DURATION)) {
        return; // Use cached data
      }

      try {
        setLoading(true);
        setError(null);

        const startOfToday = startOfDay(new Date()).toISOString();
        console.log('Fetching daily energy totals from Supabase since:', startOfToday);

        // Ensure configId is provided to prevent mixing data from different devices
        if (!configId) {
          // Set default values and skip fetch without logging warnings
          setDailyTotals({ consumption: 0, production: 0, injection: 0, importFromGrid: 0 });
          setDailyData([]);
          setLoading(false);
          return; // Skip the fetch operation
        }

        const { data, error: queryError } = await supabase
          .from('energy_data')
          .select('consumption, production, grid_total, grid_total_returned, production_total, timestamp')
          .eq('shelly_config_id', configId)
          .gte('timestamp', startOfToday)
          .order('timestamp', { ascending: true });

        if (queryError) throw new Error(queryError.message);

        console.log(`Supabase returned ${data?.length || 0} energy data records for today`);

        if (data && data.length > 0) {
          // Validate data points
          const validData = data.filter(reading => {
            return typeof reading.grid_total === 'number' &&
                   typeof reading.grid_total_returned === 'number' &&
                   typeof reading.production_total === 'number' &&
                   !isNaN(reading.grid_total) &&
                   !isNaN(reading.grid_total_returned) &&
                   !isNaN(reading.production_total);
          });

          // Use all data points without sampling
          setDailyData(validData);

          if (validData.length >= 2) {
            const firstReading = validData[0];
            const lastReading = validData[validData.length - 1];

            // Calculer les totaux de base
            const consumption = Math.max(0, (lastReading.grid_total - firstReading.grid_total));
            const injection = Math.max(0, (lastReading.grid_total_returned - firstReading.grid_total_returned));
            const production = Math.max(0, (lastReading.production_total - firstReading.production_total));
            
            // Calculer l'importation du réseau
            // Importation = Consommation - (Production - Injection)
            const consumedFromProduction = Math.max(0, production - injection);
            const importFromGrid = Math.max(0, consumption - consumedFromProduction);

            const totals = {
              consumption,
              injection,
              production,
              importFromGrid
            };

            // Validate calculated totals
            const MAX_REASONABLE_VALUE = 100000; // 100 kWh maximum
            
            // Cap any unreasonable values
            Object.entries(totals).forEach(([key, value]) => {
              if (value > MAX_REASONABLE_VALUE) {
                console.warn(`Unreasonably high ${key} value detected: ${value}Wh, capping at ${MAX_REASONABLE_VALUE}Wh`);
                totals[key as keyof DailyTotals] = MAX_REASONABLE_VALUE;
              }
            });

            console.log('Daily energy totals calculated:', totals);
            setDailyTotals(totals);
          } else {
            console.warn('Insufficient valid data points for calculation');
            setDailyTotals({ consumption: 0, production: 0, injection: 0, importFromGrid: 0 });
          }
        } else {
          setDailyTotals({ consumption: 0, production: 0, injection: 0, importFromGrid: 0 });
        }

        lastFetchTimeRef.current = Date.now();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        console.error('Error fetching daily energy totals:', errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchDailyTotals();
    
    // Set up a real-time subscription for new energy_data records
    const channel = supabase
      .channel('daily-totals-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'energy_data',
          filter: configId ? `shelly_config_id=eq.${configId}` : undefined
        },
        (payload) => {
          console.log('New energy data received, refreshing daily totals');
          fetchDailyTotals();
        }
      )
      .subscribe();

    const interval = setInterval(fetchDailyTotals, 60000); // Fallback update every minute

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [configId]);

  return { dailyTotals, dailyData, loading, error };
}
