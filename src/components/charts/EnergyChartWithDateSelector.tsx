import { useState, useMemo, useEffect } from 'react';
import { ShellyEMData } from '@/lib/types';
import { DateSelector } from '@/components/DateSelector';
import { EnergyChartWrapper } from '@/components/charts/EnergyChartWrapper';
import VisxEnergyChart from '@/components/charts/VisxEnergyChart';
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { transformToChartData } from '@/lib/dataTransformers';

interface EnergyChartWithDateSelectorProps {
  history: ShellyEMData[];
  configId?: string | null;
  title?: string;
  description?: string;
  className?: string;
}

export function EnergyChartWithDateSelector({
  history,
  configId,
  title = "Historique Énergétique",
  description = "Visualisation des données énergétiques par jour",
  className
}: EnergyChartWithDateSelectorProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);

  // Log to debug
  useEffect(() => {
    console.log("EnergyChartWithDateSelector: Selected date changed to:", selectedDate.toISOString());
  }, [selectedDate]);

  // Filter history data for the selected date
  const filteredHistory = useMemo(() => {
    if (!history || history.length === 0) return [];
    
    const start = startOfDay(selectedDate);
    const end = endOfDay(selectedDate);
    
    console.log("Filtering data for date range:", { 
      start: start.toISOString(), 
      end: end.toISOString(),
      totalDataPoints: history.length
    });
    
    const filtered = history.filter(item => {
      const itemDate = new Date(item.timestamp);
      return isWithinInterval(itemDate, { start, end });
    });
    
    console.log(`Filtered data: ${filtered.length} points out of ${history.length}`);
    return transformToChartData(filtered);
  }, [history, selectedDate]);

  const handleDateChange = (date: Date) => {
    console.log("Date selection changed to:", date.toISOString());
    // Force a new Date object to trigger state update
    setSelectedDate(new Date(date));
  };

  return (
    <EnergyChartWrapper
      title={title}
      description={description}
      className={className}
      isLoading={isLoading}
      dateSelector={
        <DateSelector
          date={selectedDate}
          onDateChange={handleDateChange}
          className="w-full md:w-auto"
        />
      }
    >
      <VisxEnergyChart history={filteredHistory} configId={configId} />
    </EnergyChartWrapper>
  );
}
