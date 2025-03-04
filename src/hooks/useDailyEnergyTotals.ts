import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay } from 'date-fns';

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

  useEffect(() => {
    const fetchDailyTotals = async () => {
      try {
        setLoading(true);
        setError(null);

        const startOfToday = startOfDay(new Date()).toISOString();
        console.log('Fetching daily energy totals from Supabase since:', startOfToday);

        const query = supabase
          .from('energy_data')
          .select('timestamp, consumption, production, grid_total, grid_total_returned, production_total')
          .gte('timestamp', startOfToday)
          .order('timestamp', { ascending: true });

        // Add shelly_config_id filter if provided
        if (configId) {
          query.eq('shelly_config_id', configId);
        }

        const { data, error: queryError } = await query;

        if (queryError) throw new Error(queryError.message);

        console.log(`Supabase returned ${data?.length || 0} energy data records for today`);

        if (data && data.length > 0) {
          // Store all daily data points
          setDailyData(data);

          // Get first and last readings of the day
          const firstReading = data[0];
          const lastReading = data[data.length - 1];
          
          // Calculate the differences only if we have valid readings
          if (firstReading && lastReading && 
              typeof firstReading.grid_total === 'number' && 
              typeof firstReading.grid_total_returned === 'number' && 
              typeof firstReading.production_total === 'number' && 
              typeof lastReading.grid_total === 'number' && 
              typeof lastReading.grid_total_returned === 'number' && 
              typeof lastReading.production_total === 'number') {
            const totals = {
              consumption: Math.max(0, (lastReading.grid_total - firstReading.grid_total)),
              injection: Math.max(0, (lastReading.grid_total_returned - firstReading.grid_total_returned)),
              production: Math.max(0, (lastReading.production_total - firstReading.production_total))
            };
            console.log('Daily energy totals calculated:', totals);
            setDailyTotals(totals);
          } else {
            console.warn('Invalid or missing data in readings');
            setDailyTotals({ consumption: 0, production: 0, injection: 0 });
          }
        } else {
          // Reset totals if no data is available
          setDailyTotals({ consumption: 0, production: 0, injection: 0 });
        }
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
  }, [configId]);

  return { dailyTotals, dailyData, loading, error };
}