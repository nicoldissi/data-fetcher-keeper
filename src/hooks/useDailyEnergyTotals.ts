
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { getDailyTotals } from '@/lib/api/data';

export interface DailyTotals {
  consumption: number;
  importFromGrid: number;
  injection: number;
  production: number;
  date: string;
  id?: string;
  config_id?: string;
}

export function useDailyEnergyTotals(configId?: string, date?: Date) {
  const targetDate = date || new Date();
  const formattedDate = format(targetDate, 'yyyy-MM-dd');

  const { data, isLoading, error } = useQuery({
    queryKey: ['dailyTotals', configId, formattedDate],
    queryFn: () => getDailyTotals(configId, formattedDate),
    enabled: !!configId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });

  // Add logging to debug the data
  useEffect(() => {
    if (data) {
      console.log('DailyEnergy Totals fetched:', data);
      
      // Calculate and log derived values for debugging
      const homeConsumption = data.importFromGrid + Math.max(0, data.production - data.injection);
      const selfConsumptionRate = data.production > 0 
        ? ((data.production - data.injection) / data.production) * 100
        : 0;
      const selfProductionRate = homeConsumption > 0 
        ? ((data.production - data.injection) / homeConsumption) * 100
        : 0;
        
      console.log('Derived values:', {
        homeConsumption: homeConsumption,
        selfConsumptionRate: selfConsumptionRate,
        selfProductionRate: selfProductionRate,
        pvToHome: (data.production - data.injection)
      });
    }
  }, [data]);

  return {
    dailyTotals: data,
    loading: isLoading,
    error
  };
}
