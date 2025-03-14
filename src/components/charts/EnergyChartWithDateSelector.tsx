
import { useState, useEffect } from 'react';
import { ShellyEMData } from '@/lib/types';
import { DateSelector } from '@/components/DateSelector';
import { EnergyChartWrapper } from '@/components/charts/EnergyChartWrapper';
import EnergyChart from '@/components/EnergyChart';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  const [filteredData, setFilteredData] = useState<ShellyEMData[]>([]);

  // Filtrer les données par date sélectionnée
  useEffect(() => {
    setIsLoading(true);
    
    try {
      if (history && history.length > 0) {
        const dayStart = startOfDay(selectedDate);
        const dayEnd = endOfDay(selectedDate);
        
        const filtered = history.filter(item => {
          const itemDate = new Date(item.timestamp);
          return isWithinInterval(itemDate, { start: dayStart, end: dayEnd });
        });
        
        setFilteredData(filtered);
        console.log(`Filtered data for ${format(selectedDate, 'yyyy-MM-dd')}: ${filtered.length} records`);
      } else {
        setFilteredData([]);
      }
    } catch (error) {
      console.error('Error filtering data by date:', error);
      setFilteredData([]);
    } finally {
      setIsLoading(false);
    }
  }, [history, selectedDate]);

  const handleDateChange = (date: Date) => {
    console.log(`Date changed to: ${format(date, 'yyyy-MM-dd')}`);
    setSelectedDate(date);
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
        />
      }
    >
      <EnergyChart history={filteredData} />
    </EnergyChartWrapper>
  );
}
