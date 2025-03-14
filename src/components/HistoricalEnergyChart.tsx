
import { useState } from 'react';
import { ShellyEMData } from '@/lib/types';
import { DateSelector } from '@/components/DateSelector';
import EnergyChart from './EnergyChart';

interface HistoricalEnergyChartProps {
  history: ShellyEMData[];
  configId?: string | null;
}

export function HistoricalEnergyChart({ history, configId }: HistoricalEnergyChartProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [chartData, setChartData] = useState<any[]>([]);

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <DateSelector 
          date={selectedDate}
          onDateChange={handleDateChange}
        />
      </div>
      
      <EnergyChart history={history} />
    </div>
  );
}

export default HistoricalEnergyChart;
