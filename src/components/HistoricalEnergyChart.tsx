
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format, fromUnixTime } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ShellyEMData } from '@/lib/types';
import { DateSelector } from '@/components/DateSelector';
import { VisxEnergyChart } from '@/components/charts/VisxEnergyChart';

interface HistoricalEnergyChartProps {
  history: ShellyEMData[];
  configId?: string | null;
}

export default function HistoricalEnergyChart({ history, configId }: HistoricalEnergyChartProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

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
      
      <VisxEnergyChart history={history} configId={configId} />
    </div>
  );
}

// For compatibility with existing imports
export { HistoricalEnergyChart };
