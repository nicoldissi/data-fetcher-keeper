import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay } from 'date-fns';
import { shouldFetchData, sampleDataPoints } from '@/lib/dataUtils';

interface DailyTotals {
  consumption: number;
  production: number;
  injection: number;
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
  const [dailyTotals, setDailyTotals] = useState<DailyTotals>({ consumption: 0, production: 0, injection: 0 });
  const [dailyData, setDailyData] = useState<DailyDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const lastFetchTimeRef = useRef<number>(0);
  const CACHE_DURATION = 60000; // 60 seconds cache to reduce database load

  useEffect(() => {
    const fetchDailyTotals = async () => {
      // Check if we should fetch new data based on cache duration
      if (!shouldFetchData(lastFetchTimeRef.current, CACHE_DURATION)) {
        return; // Use cached data
      }
      lastFetchTimeRef.current = Date.now();

      try {
        setLoading(true);
        setError(null);

        const startOfToday = startOfDay(new Date()).toISOString();
        console.log('Fetching daily energy totals from Supabase since:', startOfToday);

        // Ensure configId is provided to prevent mixing data from different devices
        if (!configId) {
          // Set default values and skip fetch without logging warnings
          setDailyTotals({ consumption: 0, production: 0, injection: 0 });
          setDailyData([]);
          setLoading(false);
          return; // Skip the fetch operation instead of throwing an error
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

          // Utiliser tous les points de données sans échantillonnage
          // Le problème n'est pas lié à la quantité de données mais à autre chose
          setDailyData(validData);

          if (validData.length >= 2) {
            const firstReading = validData[0];
            const lastReading = validData[validData.length - 1];

            const totals = {
              consumption: Math.max(0, (lastReading.grid_total - firstReading.grid_total)),
              injection: Math.max(0, (lastReading.grid_total_returned - firstReading.grid_total_returned)),
              production: Math.max(0, (lastReading.production_total - firstReading.production_total))
            };

            // Validate calculated totals with more robust checks
            const MAX_REASONABLE_VALUE = 100000; // 100 kWh is a more reasonable daily maximum
            const hasUnreasonableValues = Object.entries(totals).some(([key, value]) => {
              if (value > MAX_REASONABLE_VALUE) {
                console.warn(`Unreasonably high ${key} value detected: ${value}Wh, capping at ${MAX_REASONABLE_VALUE}Wh`);
                totals[key] = MAX_REASONABLE_VALUE; // Cap the value instead of throwing an error
                return false; // Don't consider it unreasonable after capping
              }
              return false;
            });

            console.log('Daily energy totals calculated:', totals);
            setDailyTotals(totals);
          } else {
            console.warn('Insufficient valid data points for calculation');
            setDailyTotals({ consumption: 0, production: 0, injection: 0 });
          }
        } else {
          setDailyTotals({ consumption: 0, production: 0, injection: 0 });
        }

        setLastFetchTime(Date.now());
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        console.error('Error fetching daily energy totals:', errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchDailyTotals();
    const interval = setInterval(fetchDailyTotals, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [configId, lastFetchTime]);

  return { dailyTotals, dailyData, loading, error };
}