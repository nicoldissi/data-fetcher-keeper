
import { useEffect, useState } from 'react';
import { ShellyEMData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps, Legend } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EnergyChartProps {
  data: ShellyEMData[];
  className?: string;
}

export function EnergyChart({ data, className }: EnergyChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  
  useEffect(() => {
    // Transform the data for the chart
    const transformed = data.map(item => ({
      time: new Date(item.timestamp).toLocaleTimeString(),
      gridPower: item.power,
      productionPower: item.production_power,
      netPower: item.production_power - item.power,
      timestamp: item.timestamp,
    }));
    
    setChartData(transformed);
  }, [data]);
  
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const timestamp = payload[0]?.payload?.timestamp;
      const timeAgo = timestamp ? formatDistanceToNow(new Date(timestamp), { addSuffix: true }) : '';
      
      return (
        <div className="bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-md border border-gray-100">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">{timeAgo}</p>
          {payload.map((entry, index) => (
            <p key={`item-${index}`} className="text-sm font-medium" style={{ color: entry.color }}>
              {entry.name === 'gridPower' ? 'Grid: ' : 
               entry.name === 'productionPower' ? 'Production: ' : 
               'Net Power: '}
              {entry.value} W
            </p>
          ))}
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <Card className={cn("overflow-hidden backdrop-blur-sm bg-white/90 border-0 shadow-md", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center">
          <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded mr-2">REAL-TIME</span>
          Energy Monitor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="combined" className="w-full mb-4">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="combined">Combined</TabsTrigger>
            <TabsTrigger value="grid">Grid</TabsTrigger>
            <TabsTrigger value="production">Production</TabsTrigger>
          </TabsList>
          
          <TabsContent value="combined" className="mt-2">
            <div className="h-[300px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
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
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 10 }} 
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
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
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Waiting for data...
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
                  >
                    <defs>
                      <linearGradient id="gridGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(211, 100%, 50%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(211, 100%, 50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 10 }} 
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
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
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Waiting for data...
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
                  >
                    <defs>
                      <linearGradient id="productionGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(141, 100%, 50%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(141, 100%, 50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 10 }} 
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
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
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Waiting for data...
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
