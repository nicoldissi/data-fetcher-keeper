
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ClearSkyDataPoint } from './types';

export function useClearSkyData(configId: string | null) {
  const [clearSkyData, setClearSkyData] = useState<ClearSkyDataPoint[]>([]);

  useEffect(() => {
    const fetchClearSkyData = async () => {
      if (!configId) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('clear_sky_production')
        .select('timestamp, power')
        .eq('shelly_config_id', configId)
        .gte('timestamp', today.toISOString())
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error fetching clear sky data:', error);
      } else if (data && data.length > 0) {
        console.log('Fetched clear sky data from database:', data.length, 'points');
        
        // Process the data for the chart - using the raw data points directly
        const processedData = data.map(point => ({
          timestamp: point.timestamp,
          power: point.power
        }));
        
        console.log('Total clear sky data points to use:', processedData.length);
        
        // Log the first few points to verify their format
        processedData.slice(0, 5).forEach((point, idx) => {
          console.log(`Clear sky point ${idx}: timestamp=${point.timestamp}, power=${point.power}`);
        });
        
        setClearSkyData(processedData);
      }
    };

    fetchClearSkyData();
  }, [configId]);

  return clearSkyData;
}
