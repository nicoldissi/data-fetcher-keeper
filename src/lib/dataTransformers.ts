
import { ShellyEMData } from '@/lib/types';
import { ChartDataPoint } from '@/hooks/energy-chart/types';
import { formatLocalDate } from '@/lib/dateUtils';

export const transformToChartData = (data: ShellyEMData[]): ChartDataPoint[] => {
  return data.map((item) => {
    const date = new Date(item.timestamp);
    const grid = Math.round(item.power);
    const production = Math.round(item.pv_power || 0);
    const consumption = grid + production;
    
    return {
      time: formatLocalDate(item.timestamp, {
        hour: '2-digit',
        minute: '2-digit',
        day: undefined,
        month: undefined,
        hour12: false
      }),
      timestamp: date.getTime(),
      consumption,
      production,
      grid,
      voltage: item.voltage ? Math.round(item.voltage * 10) / 10 : undefined
    };
  });
};
