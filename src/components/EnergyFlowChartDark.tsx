
import { useRef, useState, useEffect } from 'react';
import { ShellyEMData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatLocalDate, parseToLocalDate } from '@/lib/dateUtils';
import { Clock, Calendar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { D3EnergyFlow } from './energy-flow/D3EnergyFlow';
// Import the new ViSX-based component instead of D3
import { VisxRealtimeEnergyFlowComponent } from './energy-flow-visx';

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
        <CardTitle className="text-lg font-medium flex items-center justify-between">
          <div className="flex items-center">
            <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded mr-2">FLUX D'ÉNERGIE</span>
          </div>
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
        </CardTitle>
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
            <D3EnergyFlow configId={configId} className="w-full h-full" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
