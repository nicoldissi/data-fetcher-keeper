
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format, fromUnixTime, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ShellyEMData } from '@/lib/types';
import { DateSelector } from '@/components/DateSelector';
import VisxEnergyChart from '@/components/charts/VisxEnergyChart';

interface HistoricalEnergyChartProps {
  history: ShellyEMData[];
  configId?: string | null;
}

export default function HistoricalEnergyChart({ history, configId }: HistoricalEnergyChartProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Filter history data for the selected date
  const filteredHistory = useMemo(() => {
    if (!history || history.length === 0) return [];
    
    const start = startOfDay(selectedDate);
    const end = endOfDay(selectedDate);
    
    return history.filter(item => {
      const itemDate = new Date(item.timestamp);
      return isWithinInterval(itemDate, { start, end });
    });
  }, [history, selectedDate]);

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <CardTitle>Historique Énergétique</CardTitle>
          <DateSelector 
            date={selectedDate}
            onDateChange={handleDateChange}
          />
        </div>
      </CardHeader>
      <CardContent className="h-[500px]">
        <VisxEnergyChart history={filteredHistory} configId={configId} />
      </CardContent>
    </Card>
  );
}

// For compatibility with existing imports
export { HistoricalEnergyChart };
