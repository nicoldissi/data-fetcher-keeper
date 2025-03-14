
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { ShellyEMData } from '@/lib/types';
import { DateSelector } from '@/components/DateSelector';
import VisxEnergyChart from '@/components/charts/VisxEnergyChart';

interface HistoricalEnergyChartProps {
  history: ShellyEMData[];
  configId?: string | null;
}

export function HistoricalEnergyChart({ history, configId }: HistoricalEnergyChartProps) {
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
      <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 pb-2">
        <CardTitle className="text-xl">Historique Énergétique</CardTitle>
        <DateSelector 
          date={selectedDate}
          onDateChange={handleDateChange}
          className="w-full sm:w-auto mt-2 sm:mt-0"
        />
      </CardHeader>
      <CardContent className="h-[500px] pt-6">
        <VisxEnergyChart history={filteredHistory} configId={configId} />
      </CardContent>
    </Card>
  );
}

// Make component exportable as a named export for compatibility with existing imports
export { HistoricalEnergyChart };
