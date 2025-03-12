
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
        
        // Create a more granular interpolation for smoother curve
        const interpolatedData: ClearSkyDataPoint[] = [];
        
        // Create points every minute for smoother curve
        const intervalMinutes = 1;
        
        for (let i = 0; i < data.length - 1; i++) {
          const current = data[i];
          const next = data[i + 1];
          
          // Parse dates from ISO strings to get local time
          const currentTime = new Date(current.timestamp);
          const nextTime = new Date(next.timestamp);
          
          // Calculate time difference in minutes
          const timeDiffMinutes = (nextTime.getTime() - currentTime.getTime()) / (1000 * 60);
          const powerDiff = next.power - current.power;
          
          // Calculate number of steps needed based on interval
          const steps = Math.floor(timeDiffMinutes / intervalMinutes);
          
          if (steps > 0) {
            // Create interpolated points at regular intervals
            for (let step = 0; step <= steps; step++) {
              // Calculate exact point in time for this step
              const stepTime = new Date(currentTime.getTime() + (step * intervalMinutes * 60 * 1000));
              
              // Calculate interpolated power value (linear interpolation)
              const stepProgress = step / steps;
              const stepPower = current.power + (powerDiff * stepProgress);
              
              interpolatedData.push({
                timestamp: stepTime.toISOString(),
                power: stepPower
              });
            }
          } else {
            // If steps == 0, just add the current point
            interpolatedData.push({
              timestamp: currentTime.toISOString(),
              power: current.power
            });
          }
        }
        
        // Add the last point if it hasn't been added yet
        const lastPoint = data[data.length - 1];
        const lastTime = new Date(lastPoint.timestamp);
        const lastTimeExists = interpolatedData.some(
          point => new Date(point.timestamp).getTime() === lastTime.getTime()
        );
        
        if (!lastTimeExists) {
          interpolatedData.push({
            timestamp: lastTime.toISOString(),
            power: lastPoint.power
          });
        }
        
        console.log('Created smoother interpolated clear sky data with', interpolatedData.length, 'points');
        setClearSkyData(interpolatedData);
      }
    };

    fetchClearSkyData();
  }, [configId]);

  return clearSkyData;
}
