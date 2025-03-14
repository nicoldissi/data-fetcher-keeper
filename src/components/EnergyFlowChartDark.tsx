
import { useRef, useState, useEffect } from 'react';
import { ShellyEMData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatLocalDate, parseToLocalDate } from '@/lib/dateUtils';
import { Clock, Calendar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { D3EnergyFlow } from './energy-flow/D3EnergyFlow';
import { VisxRealtimeEnergyFlowComponent } from './energy-flow-visx';
import { DateSelector } from './DateSelector';

interface EnergyFlowChartDarkProps {
  data: ShellyEMData | null;
  className?: string;
  configId?: string;
}

export function EnergyFlowChartDark({
  data,
  className,
  configId
}: EnergyFlowChartDarkProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'realtime' | 'daily'>('realtime');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    if (!data) return;
    if (!hasData) {
      setHasData(true);
    }
    console.log('EnergyFlowChartDark received new data:', data);
    const localDate = parseToLocalDate(data.timestamp);
    const formattedTime = formatLocalDate(data.timestamp);
    console.log('Converted timestamp:', formattedTime);
  }, [data]);

  return (
    <Card className={cn("overflow-hidden backdrop-blur-sm bg-white/90 border-0 shadow-md h-full", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Tabs 
            value={viewMode} 
            onValueChange={(value) => setViewMode(value as 'realtime' | 'daily')} 
            className="w-auto"
          >
            <TabsList className="grid grid-cols-2 w-[250px]">
              <TabsTrigger value="realtime" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Temps réel</span>
              </TabsTrigger>
              <TabsTrigger value="daily" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Journalier</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {viewMode === 'daily' && (
            <DateSelector 
              date={selectedDate} 
              onDateChange={setSelectedDate} 
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-center p-4 h-[calc(100%-60px)]">
        {viewMode === 'realtime' ? (
          data ? (
            <div className="w-full h-full">
              <VisxRealtimeEnergyFlowComponent 
                data={data} 
                className="w-full h-full" 
                configId={configId} 
              />
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <p>En attente de données...</p>
              <p className="text-sm">Les données seront affichées dès qu'elles seront disponibles.</p>
            </div>
          )
        ) : (
          <div className="w-full h-full">
            <D3EnergyFlow configId={configId} date={selectedDate} className="w-full h-full" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
