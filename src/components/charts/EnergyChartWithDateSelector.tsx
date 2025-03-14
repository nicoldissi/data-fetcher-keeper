
import { useState } from 'react';
import { ShellyEMData } from '@/lib/types';
import { DateSelector } from '@/components/DateSelector';
import { EnergyChartWrapper } from '@/components/charts/EnergyChartWrapper';
import EnergyChart from '@/components/EnergyChart';

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
        />
      }
    >
      <EnergyChart history={history} />
    </EnergyChartWrapper>
  );
}
