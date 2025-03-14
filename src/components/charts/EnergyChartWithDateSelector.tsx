
import { useState, useMemo } from 'react';
import { ShellyEMData } from '@/lib/types';
import { DateSelector } from '@/components/DateSelector';
import { EnergyChartWrapper } from '@/components/charts/EnergyChartWrapper';
import VisxEnergyChart from '@/components/charts/VisxEnergyChart';
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns';

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

  return (
    <EnergyChartWrapper
      title={title}
      description={description}
      className={className}
      isLoading={isLoading}
      dateSelector={
        <DateSelector
          date={selectedDate}
          onDateChange={setSelectedDate}
          className="w-full sm:w-auto"
        />
      }
    >
      <VisxEnergyChart history={filteredHistory} configId={configId} />
    </EnergyChartWrapper>
  );
}
