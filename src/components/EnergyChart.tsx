
import { useEffect, useState, useRef } from 'react';
import { ShellyEMData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, TooltipProps, Legend, ReferenceArea
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDailyEnergyTotals } from '@/hooks/useDailyEnergyTotals';
import { RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EnergyChartProps {
  data: ShellyEMData[];
  className?: string;
  configId?: string;
}

export function EnergyChart({ data, className, configId }: EnergyChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  const { dailyData } = useDailyEnergyTotals(configId);
  
  // États pour le zoom
  const [leftIndex, setLeftIndex] = useState<number | null>(null);
  const [rightIndex, setRightIndex] = useState<number | null>(null);
  const [startX, setStartX] = useState<number | null>(null);
  const [endX, setEndX] = useState<number | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [originalDomain, setOriginalDomain] = useState<[number, number] | null>(null);
  const [currentDomain, setCurrentDomain] = useState<[number, number] | null>(null);
  
  useEffect(() => {
    // Get start of current day
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
  
    // Transform the daily data for initial chart population, filtering for today only
    const dailyChartData = Array.isArray(dailyData) ? dailyData
      .filter(item => new Date(item.timestamp) >= startOfToday)
      .map(item => {
        const localDate = new Date(item.timestamp);
        localDate.setHours(localDate.getHours() + 1);
        return {
          time: localDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          gridPower: item.consumption,
          productionPower: item.production,
          netPower: item.consumption,
          consumption: item.production + item.consumption,
          timestamp: localDate.getTime(),
        };
      }) : [];
  
    // Transform the real-time data, filtering for today only
    const realtimeChartData = Array.isArray(data) ? data
      .filter(item => new Date(item.timestamp) >= startOfToday)
      .map(item => {
        const localDate = new Date(item.timestamp);
        return {
          time: localDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          gridPower: item.power,
          productionPower: item.production_power,
          netPower: item.power,
          consumption: item.production_power + item.power,
          timestamp: localDate.getTime(),
        };
      }) : [];
  
    // Combine both datasets, removing duplicates based on timestamp
    const combinedData = [...dailyChartData, ...realtimeChartData];
    const uniqueData = Array.from(new Map(combinedData.map(item => [item.timestamp, item])).values());
    
    // Sort by timestamp
    uniqueData.sort((a, b) => a.timestamp - b.timestamp);
    
    setChartData(uniqueData);
    
    // Set original domain if we have data and haven't set it yet
    if (uniqueData.length > 0 && !originalDomain) {
      const firstTimestamp = uniqueData[0].timestamp;
      const lastTimestamp = uniqueData[uniqueData.length - 1].timestamp;
      setOriginalDomain([firstTimestamp, lastTimestamp]);
      
      // Initialize current domain if not already set
      if (!currentDomain) {
        setCurrentDomain([firstTimestamp, lastTimestamp]);
      }
    }
  }, [data, dailyData, originalDomain, currentDomain]);
  
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const timestamp = payload[0]?.payload?.timestamp;
      const timeAgo = timestamp ? formatDistanceToNow(new Date(timestamp), { addSuffix: true }) : '';
      
      return (
        <div className="bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-md border border-gray-100">
          <p className="text-sm font-medium">{new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          <p className="text-sm text-muted-foreground">{timeAgo}</p>
          {payload.map((entry, index) => (
            <p key={`item-${index}`} className="text-sm font-medium" style={{ color: entry.color }}>
              {entry.dataKey === 'gridPower' ? 'Réseau: ' : 
               entry.dataKey === 'productionPower' ? 'Production: ' : 
               entry.dataKey === 'consumption' ? 'Consommation: ' :
               'Puissance: '}
              {Number(entry.value).toFixed(1)} W
            </p>
          ))}
        </div>
      );
    }
    
    return null;
  };
  
  // Gestionnaires d'événements pour le zoom
  const handleMouseDown = (e: any) => {
    if (!e || !e.activeLabel) return;
    setStartX(e.activeLabel);
    setLeftIndex(e.activeTooltipIndex);
  };
  
  const handleMouseMove = (e: any) => {
    if (!e || !e.activeLabel || startX === null || leftIndex === null) return;
    setEndX(e.activeLabel);
    setRightIndex(e.activeTooltipIndex);
  };
  
  const handleMouseUp = () => {
    if (leftIndex !== null && rightIndex !== null && startX !== null && endX !== null) {
      // Assure-toi que l'utilisateur a fait glisser la souris
      if (Math.abs(rightIndex - leftIndex) > 1) {
        // Calcule le domaine de zoom
        const newDomain: [number, number] = [
          Math.min(startX, endX),
          Math.max(startX, endX)
        ];
        
        setCurrentDomain(newDomain);
        setIsZoomed(true);
      }
    }
    
    // Réinitialise les valeurs de départ
    setLeftIndex(null);
    setRightIndex(null);
    setStartX(null);
    setEndX(null);
  };
  
  const resetZoom = () => {
    if (originalDomain) {
      setCurrentDomain(originalDomain);
      setIsZoomed(false);
    }
  };
  
  return (
    <Card className={cn("overflow-hidden backdrop-blur-sm bg-white/90 border-0 shadow-md", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center justify-between">
          <div className="flex items-center">
            <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded mr-2">TEMPS RÉEL</span>
            Moniteur d'Énergie
          </div>
          {isZoomed && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetZoom} 
              className="flex items-center gap-1 text-xs"
            >
              <RefreshCcw size={14} />
              Réinitialiser le zoom
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="combined" className="w-full mb-4">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="combined">Combiné</TabsTrigger>
            <TabsTrigger value="grid">Réseau</TabsTrigger>
            <TabsTrigger value="production">Production</TabsTrigger>
            <TabsTrigger value="consumption">Consommation</TabsTrigger>
          </TabsList>
          
          <TabsContent value="combined" className="mt-2">
            <div className="h-[300px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                  >
                    <defs>
                      <linearGradient id="gridGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(211, 100%, 50%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(211, 100%, 50%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="productionGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(141, 100%, 50%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(141, 100%, 50%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="consumptionGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="timestamp" 
                      type="number"
                      domain={currentDomain || ['dataMin', 'dataMax']}
                      scale="time"
                      tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      tick={{ fontSize: 10 }} 
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                      interval="preserveStartEnd"
                      minTickGap={50}
                      allowDataOverflow
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }} 
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                      unit=" W"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="gridPower" 
                      name="Grid"
                      stroke="hsl(211, 100%, 50%)" 
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#gridGradient)" 
                      animationDuration={300}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="productionPower" 
                      name="Production"
                      stroke="hsl(141, 100%, 50%)" 
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#productionGradient)" 
                      animationDuration={300}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="consumption" 
                      name="Consumption"
                      stroke="hsl(25, 95%, 53%)" 
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#consumptionGradient)" 
                      animationDuration={300}
                    />
                    
                    {leftIndex !== null && rightIndex !== null && (
                      <ReferenceArea 
                        x1={startX} 
                        x2={endX} 
                        strokeOpacity={0.3}
                        fill="#8884d8"
                        fillOpacity={0.1} 
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  En attente de données...
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="grid" className="mt-2">
            <div className="h-[300px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                  >
                    <defs>
                      <linearGradient id="gridGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(211, 100%, 50%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(211, 100%, 50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="timestamp" 
                      type="number"
                      domain={currentDomain || ['dataMin', 'dataMax']}
                      scale="time"
                      tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      tick={{ fontSize: 10 }} 
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                      interval="preserveStartEnd"
                      minTickGap={50}
                      allowDataOverflow
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }} 
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                      unit=" W"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="gridPower" 
                      name="Grid"
                      stroke="hsl(211, 100%, 50%)" 
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#gridGradient)" 
                      animationDuration={300}
                    />
                    
                    {leftIndex !== null && rightIndex !== null && (
                      <ReferenceArea 
                        x1={startX} 
                        x2={endX} 
                        strokeOpacity={0.3}
                        fill="#8884d8"
                        fillOpacity={0.1} 
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  En attente de données...
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="production" className="mt-2">
            <div className="h-[300px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                  >
                    <defs>
                      <linearGradient id="productionGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(141, 100%, 50%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(141, 100%, 50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="timestamp" 
                      type="number"
                      domain={currentDomain || ['dataMin', 'dataMax']}
                      scale="time"
                      tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      tick={{ fontSize: 10 }} 
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                      interval="preserveStartEnd"
                      minTickGap={50}
                      allowDataOverflow
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }} 
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                      unit=" W"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="productionPower" 
                      name="Production"
                      stroke="hsl(141, 100%, 50%)" 
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#productionGradient)" 
                      animationDuration={300}
                    />
                    
                    {leftIndex !== null && rightIndex !== null && (
                      <ReferenceArea 
                        x1={startX} 
                        x2={endX} 
                        strokeOpacity={0.3}
                        fill="#8884d8"
                        fillOpacity={0.1} 
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  En attente de données...
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="consumption" className="mt-2">
            <div className="h-[300px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                  >
                    <defs>
                      <linearGradient id="consumptionGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="timestamp" 
                      type="number"
                      domain={currentDomain || ['dataMin', 'dataMax']}
                      scale="time"
                      tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      tick={{ fontSize: 10 }} 
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                      interval="preserveStartEnd"
                      minTickGap={50}
                      allowDataOverflow
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }} 
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                      unit=" W"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="consumption" 
                      name="Consumption"
                      stroke="hsl(25, 95%, 53%)" 
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#consumptionGradient)" 
                      animationDuration={300}
                    />
                    
                    {leftIndex !== null && rightIndex !== null && (
                      <ReferenceArea 
                        x1={startX} 
                        x2={endX} 
                        strokeOpacity={0.3}
                        fill="#8884d8"
                        fillOpacity={0.1} 
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  En attente de données...
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
