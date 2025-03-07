
import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Area, ComposedChart, Brush, ReferenceLine 
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ShellyEMData } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface HistoricalEnergyChartProps {
  history: ShellyEMData[];
}

// Define the type for the chart data points
interface ChartDataPoint {
  time: string;
  timestamp: number;
  consumption: number;
  production: number;
  grid: number;
}

export default function HistoricalEnergyChart({ history }: HistoricalEnergyChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [activeTab, setActiveTab] = useState('combined');
  
  // Toggle visibility of lines
  const [showConsumption, setShowConsumption] = useState(true);
  const [showProduction, setShowProduction] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  useEffect(() => {
    // Transform all history data for the chart without limiting data points
    const transformedData: ChartDataPoint[] = history.map((item: ShellyEMData) => {
      const date = new Date(item.timestamp);
      const consumption = Math.round(Math.abs(item.power) + (item.production_power || 0));
      const production = Math.round(item.production_power || 0);
      const grid = Math.round(item.power);
      
      return {
        time: format(date, 'HH:mm', { locale: fr }),
        timestamp: item.timestamp,
        consumption,
        production,
        grid
      };
    });

    setChartData(transformedData);
  }, [history]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Find the max value for Y axis scaling
  const maxValue = chartData.length > 0 
    ? Math.max(
        ...chartData.map(d => Math.max(
          showConsumption ? d.consumption : 0,
          showProduction ? d.production : 0,
          showGrid ? Math.abs(d.grid) : 0
        ))
      ) 
    : 3000; // Default max if no data

  const minValue = chartData.length > 0
    ? Math.min(
        ...chartData.map(d => Math.min(
          showGrid ? d.grid : 0
        ))
      )
    : -1500; // Default min if no data

  // Custom tooltip to handle all series
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md shadow-md p-3">
          <p className="font-semibold">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`tooltip-${index}`} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-muted-foreground">{entry.name}:</span>
              <span className="font-medium">{`${Math.abs(entry.value)} W`}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Historique de Consommation et Production</CardTitle>
            <CardDescription>
              Évolution de la consommation et production d'énergie
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Toggle 
              pressed={showConsumption} 
              onPressedChange={setShowConsumption}
              className={`${showConsumption ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100' : ''}`}
            >
              <div className="w-3 h-3 rounded-full bg-orange-500 mr-2" />
              Consommation
            </Toggle>
            <Toggle 
              pressed={showProduction} 
              onPressedChange={setShowProduction}
              className={`${showProduction ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : ''}`}
            >
              <div className="w-3 h-3 rounded-full bg-green-500 mr-2" />
              Production
            </Toggle>
            <Toggle 
              pressed={showGrid} 
              onPressedChange={setShowGrid}
              className={`${showGrid ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' : ''}`}
            >
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
              Réseau
            </Toggle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="combined" onValueChange={handleTabChange}>
          <TabsList className="grid grid-cols-4 max-w-md mb-4">
            <TabsTrigger value="combined">Combiné</TabsTrigger>
            <TabsTrigger value="grid">Réseau</TabsTrigger>
            <TabsTrigger value="production">Production</TabsTrigger>
            <TabsTrigger value="consumption">Consommation</TabsTrigger>
          </TabsList>

          <div className="h-[400px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{
                    top: 5,
                    right: 20,
                    left: 10,
                    bottom: 50,
                  }}
                >
                  <defs>
                    <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorProduction" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorGridPos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis 
                    dataKey="time" 
                    minTickGap={60}
                    tick={{ fontSize: 12 }}
                    tickMargin={10}
                  />
                  <YAxis 
                    domain={[minValue < 0 ? 1.1 * minValue : -500, 1.1 * maxValue]}
                    tickFormatter={(value) => `${value}`}
                    label={{ 
                      value: 'Watts', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle' },
                      offset: 0
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    wrapperStyle={{ paddingTop: '10px' }}
                    formatter={(value, entry, index) => {
                      return <span style={{ color: entry.color, fontWeight: 'bold' }}>{value}</span>;
                    }}
                  />
                  <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                  
                  {/* Only show relevant graphs based on selected tab */}
                  {(activeTab === 'combined' || activeTab === 'grid') && showGrid && (
                    <Line
                      type="monotone"
                      dataKey="grid"
                      name="Réseau"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                      hide={!showGrid}
                    />
                  )}
                  
                  {(activeTab === 'combined' || activeTab === 'production') && showProduction && (
                    <Line
                      type="monotone"
                      dataKey="production"
                      name="Production"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                      hide={!showProduction}
                    />
                  )}
                  
                  {(activeTab === 'combined' || activeTab === 'consumption') && showConsumption && (
                    <Line
                      type="monotone"
                      dataKey="consumption"
                      name="Consommation"
                      stroke="#f97316"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                      hide={!showConsumption}
                    />
                  )}
                  
                  {/* Brush for zooming/timeline selection */}
                  <Brush 
                    dataKey="time" 
                    height={30} 
                    stroke="#8884d8"
                    tickFormatter={(tick) => tick}
                    y={320}
                    fill="#f5f5f5"
                    startIndex={Math.max(0, chartData.length - Math.min(chartData.length, 50))}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Pas de données disponibles</p>
              </div>
            )}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
