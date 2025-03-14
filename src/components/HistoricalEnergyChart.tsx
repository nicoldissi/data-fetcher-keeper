
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, fromUnixTime } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ShellyEMData } from '@/lib/types';
import { DateSelector } from '@/components/DateSelector';
import EnergyChart from './EnergyChart';

interface HistoricalEnergyChartProps {
  history: ShellyEMData[];
  configId?: string | null;
}

export default function HistoricalEnergyChart({ history, configId }: HistoricalEnergyChartProps) {
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
