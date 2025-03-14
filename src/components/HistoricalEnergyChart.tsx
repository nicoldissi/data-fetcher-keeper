
import { useState, useMemo } from 'react';
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { ShellyEMData } from '@/lib/types';
import { DateSelector } from '@/components/DateSelector';
import VisxEnergyChart from '@/components/charts/VisxEnergyChart';
import { EnergyChartWrapper } from '@/components/charts/EnergyChartWrapper';

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
    console.log("HistoricalEnergyChart: Date changed to:", date);
    setSelectedDate(date);
  };

  return (
    <EnergyChartWrapper
      title="Historique Énergétique"
      description="Visualisation des données énergétiques par jour"
      dateSelector={
        <DateSelector 
          date={selectedDate}
          onDateChange={handleDateChange}
          className="w-full sm:w-auto"
        />
      }
    >
      <VisxEnergyChart history={filteredHistory} configId={configId} />
    </EnergyChartWrapper>
  );
}
