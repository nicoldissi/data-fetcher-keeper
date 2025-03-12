
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
        console.log('Fetched clear sky data:', data);
        
        // Process the data for the chart - using the raw data points directly
        const processedData = data.map(point => ({
          timestamp: point.timestamp,
          power: point.power
        }));
        
        console.log('Using original clear sky data points:', processedData.length);
        setClearSkyData(processedData);
      }
    };

    fetchClearSkyData();
  }, [configId]);

  return clearSkyData;
}
