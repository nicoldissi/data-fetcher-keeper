
import { ShellyEMData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatLocalDate, parseToLocalDate } from '@/lib/dateUtils';
import { useState } from 'react';
import { DateSelector } from './DateSelector';

interface DataTableProps {
  data: ShellyEMData[];
  className?: string;
  configId?: string | null;
}

export function DataTable({ data, className, configId }: DataTableProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Filter data based on selected date (same day)
  const filterDataByDate = (items: ShellyEMData[], date: Date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return items.filter(item => {
      const itemDate = parseToLocalDate(item.timestamp);
      return itemDate >= startOfDay && itemDate <= endOfDay;
    });
  };
  
  const filteredByConfig = configId 
    ? data.filter(item => item.shelly_config_id === configId)
    : data;
    
  const filteredByDate = filterDataByDate(filteredByConfig, selectedDate);
  const reversedData = [...filteredByDate].reverse().slice(0, 5);
  
  return (
    <Card className={cn("overflow-hidden backdrop-blur-sm bg-white/90 border-0 shadow-md", className)}>
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="text-lg font-medium">Lectures récentes</CardTitle>
          <DateSelector 
            date={selectedDate} 
            onDateChange={setSelectedDate}
          />
        </div>
      </CardHeader>
      <CardContent>
        {reversedData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Time</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">Réseau</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">Photovoltaïque</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">Voltage</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">Intensité réseau</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">Intensité PV</th>
                </tr>
              </thead>
              <tbody>
                {reversedData.map((item, index) => {
                  const formattedTime = formatLocalDate(item.timestamp);
                  
                  const localDate = parseToLocalDate(item.timestamp);
                  
                  const timeAgo = formatDistance(localDate, new Date(), { 
                    addSuffix: true,
                    locale: fr 
                  });
                  
                  const gridCurrent = item.voltage > 0 ? Math.abs(item.power) / item.voltage : 0;
                  
                  const pvCurrent = item.voltage > 0 ? item.pv_power / item.voltage : 0;
                  
                  return (
                    <tr 
                      key={item.timestamp} 
                      className={cn(
                        "border-b border-gray-100 transition-colors",
                        index === 0 ? "bg-blue-50/50" : "hover:bg-gray-50"
                      )}
                    >
                      <td className="px-4 py-3 text-left">
                        <div className="font-medium">
                          {formattedTime}
                        </div>
                        <div className="text-xs text-gray-500">{timeAgo}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {item.power.toFixed(1)} W
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {item.pv_power.toFixed(1)} W
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.voltage.toFixed(1)} V
                      </td>
                      <td className="px-4 py-3 text-right">
                        {gridCurrent.toFixed(2)} A
                      </td>
                      <td className="px-4 py-3 text-right">
                        {pvCurrent.toFixed(2)} A
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Aucune donnée disponible pour cette date
          </div>
        )}
      </CardContent>
    </Card>
  );
}
