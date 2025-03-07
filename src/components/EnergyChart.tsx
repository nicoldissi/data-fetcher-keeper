
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Area, ComposedChart, ReferenceLine 
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ShellyEMData } from '@/lib/types';
import { Toggle } from '@/components/ui/toggle';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';

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
  const [fullDayData, setFullDayData] = useState<ChartDataPoint[]>([]);
  const [isLoadingFullDay, setIsLoadingFullDay] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  
  // Toggle visibility of lines
  const [showConsumption, setShowConsumption] = useState(true);
  const [showProduction, setShowProduction] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  // Extract configId from the first history item
  useEffect(() => {
    if (history.length > 0 && history[0].shelly_config_id) {
      setConfigId(history[0].shelly_config_id);
    }
  }, [history]);

  // Fetch full day data from Supabase
  useEffect(() => {
    const fetchFullDayData = async () => {
      if (!configId) return;
      
      setIsLoadingFullDay(true);
      
      try {
        // Get start of the current day in ISO format
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfDay = today.toISOString();
        
        console.log('Fetching full day data since:', startOfDay);
        
        const { data, error } = await supabase
          .from('energy_data')
          .select('*')
          .eq('shelly_config_id', configId)
          .gte('timestamp', startOfDay)
          .order('timestamp', { ascending: true });
          
        if (error) throw error;
        
        console.log(`Fetched ${data?.length || 0} data points for the full day`);
        
        if (data && data.length > 0) {
          // Transform the data for the chart
          const transformedData: ChartDataPoint[] = data.map((item: any) => {
            // Parse ISO string to Date object for proper local time formatting
            const date = new Date(item.timestamp);
            // Ensure consumption = grid + production with positive values
            const grid = Math.round(item.consumption || 0);
            const production = Math.round(item.production || 0);
            const consumption = grid + production;
            
            return {
              // Format in local time using the browser's timezone
              time: format(date, 'HH:mm', { locale: fr }),
              timestamp: date.getTime(),
              consumption,
              production,
              grid
            };
          });
          
          setFullDayData(transformedData);
        }
      } catch (err) {
        console.error('Error fetching full day data:', err);
      } finally {
        setIsLoadingFullDay(false);
      }
    };
    
    fetchFullDayData();
  }, [configId]);

  // Use both sources of data
  useEffect(() => {
    if (fullDayData.length > 0) {
      // Use the full day data if available
      setChartData(fullDayData);
    } else if (history.length > 0) {
      // Fall back to the history prop if full day data isn't ready
      const transformedData: ChartDataPoint[] = history.map((item: ShellyEMData) => {
        // Convert timestamp to local time
        const date = new Date(item.timestamp);
        // Ensure consumption = grid + production
        const grid = Math.round(item.power);
        const production = Math.round(item.production_power || 0);
        const consumption = grid + production;
        
        return {
          // Format in local time using the browser's timezone
          time: format(date, 'HH:mm', { locale: fr }),
          timestamp: date.getTime(),
          consumption,
          production,
          grid
        };
      });

      setChartData(transformedData);
    }
  }, [history, fullDayData]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Calculate max and min values for dynamic Y axis based on visible data and enabled lines
  const calculateYAxisDomain = useCallback(() => {
    if (chartData.length === 0) {
      return [-500, 3000]; // Default if no data
    }
    
    // Find max value based on which lines are shown
    const maxValue = Math.max(
      ...chartData.map(d => Math.max(
        showConsumption ? d.consumption : 0,
        showProduction ? d.production : 0,
        showGrid ? Math.abs(d.grid) : 0
      ))
    );
    
    // Find min value (for grid which can be negative)
    const minValue = Math.min(
      ...chartData.map(d => Math.min(
        showGrid ? d.grid : 0
      ))
    );
    
    // Add 10% padding to max and min for better visualization
    return [minValue < 0 ? 1.1 * minValue : -100, 1.1 * maxValue];
  }, [chartData, showConsumption, showProduction, showGrid]);

  // Custom tooltip to handle all series
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md shadow-md p-3 font-sans">
          <p className="font-semibold">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`tooltip-${index}`} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-muted-foreground">{entry.name}:</span>
              <span className="font-medium">{`${Math.abs(Math.round(entry.value))} W`}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Common font styling for the chart
  const fontStyle = {
    fontFamily: 'system-ui, sans-serif',
    fontSize: 12,
    fontWeight: 'normal' // Changed from bold to normal
  };

  const axisLabelStyle = {
    ...fontStyle,
    fontSize: 14,
    textAnchor: 'middle',
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
              <div className="w-3 h-3 rounded-full bg-[#F97415] mr-2" />
              Consommation
            </Toggle>
            <Toggle 
              pressed={showProduction} 
              onPressedChange={setShowProduction}
              className={`${showProduction ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : ''}`}
            >
              <div className="w-3 h-3 rounded-full bg-[#00FF59] mr-2" />
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
                    top: 10,
                    right: 30,
                    left: 20,
                    bottom: 40,
                  }}
                >
                  <defs>
                    <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97415" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#F97415" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorProduction" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00FF59" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#00FF59" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorGridPos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorGridNeg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis 
                    dataKey="time" 
                    minTickGap={60}
                    tick={fontStyle}
                    tickMargin={10}
                    label={{
                      value: 'Heure',
                      position: 'insideBottomRight',
                      offset: -10,
                      style: axisLabelStyle
                    }}
                  />
                  <YAxis 
                    domain={calculateYAxisDomain()}
                    tickFormatter={(value) => `${Math.round(value)} W`}
                    label={{ 
                      value: '', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: axisLabelStyle,
                      offset: 0
                    }}
                    tick={fontStyle}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ 
                      fontFamily: 'system-ui, sans-serif',
                      fontSize: 14,
                      fontWeight: 'normal', // Changed from bold to normal
                      paddingTop: '10px'
                    }}
                    formatter={(value, entry, index) => {
                      return <span style={{ color: entry.color, fontWeight: 'normal', fontFamily: 'system-ui, sans-serif' }}>{value}</span>;
                    }}
                  />
                  <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                  
                  {/* Only show relevant graphs based on selected tab */}
                  {(activeTab === 'combined' || activeTab === 'grid') && showGrid && (
                    <>
                      <Area
                        type="monotone"
                        dataKey="grid"
                        name="Réseau"
                        fill="url(#colorGridPos)"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 2 }}
                        hide={!showGrid}
                      />
                    </>
                  )}
                  
                  {(activeTab === 'combined' || activeTab === 'production') && showProduction && (
                    <Area
                      type="monotone"
                      dataKey="production"
                      name="Production"
                      fill="url(#colorProduction)"
                      stroke="#00FF59"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                      hide={!showProduction}
                    />
                  )}
                  
                  {(activeTab === 'combined' || activeTab === 'consumption') && showConsumption && (
                    <Area
                      type="monotone"
                      dataKey="consumption"
                      name="Consommation"
                      fill="url(#colorConsumption)"
                      stroke="#F97415"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                      hide={!showConsumption}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">
                  {isLoadingFullDay ? 'Chargement des données...' : 'Pas de données disponibles'}
                </p>
              </div>
            )}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
