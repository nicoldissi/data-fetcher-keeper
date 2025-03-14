import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Area, ComposedChart, ReferenceLine 
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ShellyEMData } from '@/lib/types';
import { Toggle } from '@/components/ui/toggle';
import { supabase } from '@/integrations/supabase/client';
import { Zap, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateSelector } from '@/components/DateSelector';

interface HistoricalEnergyChartProps {
  history: ShellyEMData[];
}

interface ChartDataPoint {
  time: string;
  timestamp: number;
  consumption: number;
  production: number;
  grid: number;
  voltage?: number;
}

export default function HistoricalEnergyChart({ history }: HistoricalEnergyChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [fullDayData, setFullDayData] = useState<ChartDataPoint[]>([]);
  const [isLoadingFullDay, setIsLoadingFullDay] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [showConsumption, setShowConsumption] = useState(true);
  const [showProduction, setShowProduction] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showVoltage, setShowVoltage] = useState(false);

  const [zoomLevel, setZoomLevel] = useState(100);
  const [zoomRange, setZoomRange] = useState<[number, number]>([0, 100]);
  const [zoomTimeRange, setZoomTimeRange] = useState<string>('1h');
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (history.length > 0 && history[0].shelly_config_id) {
      setConfigId(history[0].shelly_config_id);
    }
  }, [history]);

  useEffect(() => {
    const fetchFullDayData = async () => {
      if (!configId) return;
      
      setIsLoadingFullDay(true);
      
      try {
        const dayStart = new Date(selectedDate);
        dayStart.setHours(0, 0, 0, 0);
        const startOfDay = dayStart.toISOString();
        
        const dayEnd = new Date(selectedDate);
        dayEnd.setHours(23, 59, 59, 999);
        const endOfDay = dayEnd.toISOString();
        
        console.log('Fetching data for:', startOfDay, 'to', endOfDay);
        
        const { data, error } = await supabase
          .from('energy_data')
          .select('*')
          .eq('shelly_config_id', configId)
          .gte('timestamp', startOfDay)
          .lte('timestamp', endOfDay)
          .order('timestamp', { ascending: true });
          
        if (error) throw error;
        
        console.log(`Fetched ${data?.length || 0} data points for the selected day`);
        
        if (data && data.length > 0) {
          const transformedData: ChartDataPoint[] = data.map((item: any) => {
            const date = new Date(item.timestamp);
            const grid = Math.round(item.consumption || 0);
            const production = Math.round(item.production || 0);
            const consumption = grid + production;
            
            return {
              time: format(date, 'HH:mm', { locale: fr }),
              timestamp: date.getTime(),
              consumption,
              production,
              grid,
              voltage: item.voltage ? Math.round(item.voltage * 10) / 10 : undefined
            };
          });
          
          setFullDayData(transformedData);
        } else {
          setFullDayData([]);
        }
      } catch (err) {
        console.error('Error fetching full day data:', err);
      } finally {
        setIsLoadingFullDay(false);
      }
    };
    
    fetchFullDayData();
  }, [configId, selectedDate]);

  const applyZoom = useCallback(() => {
    if (fullDayData.length === 0 && history.length === 0) return;
    
    const sourceData = fullDayData.length > 0 ? fullDayData : 
      history.map((item: ShellyEMData) => {
        const date = new Date(item.timestamp);
        const grid = Math.round(item.power);
        const production = Math.round(item.pv_power || 0);
        const consumption = grid + production;
        
        return {
          time: format(date, 'HH:mm', { locale: fr }),
          timestamp: date.getTime(),
          consumption,
          production,
          grid,
          voltage: item.voltage ? Math.round(item.voltage * 10) / 10 : undefined
        };
      });
    
    if (zoomRange[0] === 0 && zoomRange[1] === 100) {
      setChartData(sourceData);
      return;
    }
    
    const startIndex = Math.floor(sourceData.length * zoomRange[0] / 100);
    const endIndex = Math.ceil(sourceData.length * zoomRange[1] / 100);
    
    setChartData(sourceData.slice(startIndex, endIndex));
  }, [fullDayData, history, zoomRange]);

  const setZoomByTimeRange = useCallback((range: string) => {
    setZoomTimeRange(range);
    
    if (range === 'all') {
      setZoomRange([0, 100]);
      return;
    }
    
    const sourceData = fullDayData.length > 0 ? fullDayData : 
      history.map((item: ShellyEMData) => ({
        timestamp: new Date(item.timestamp).getTime()
      }));
    
    if (sourceData.length === 0) return;
    
    const now = new Date().getTime();
    let hoursToShow = 1;
    
    switch (range) {
      case '1h': hoursToShow = 1; break;
      case '3h': hoursToShow = 3; break;
      case '6h': hoursToShow = 6; break;
      case '12h': hoursToShow = 12; break;
      case '24h': hoursToShow = 24; break;
      default: hoursToShow = 1;
    }
    
    const rangeMs = hoursToShow * 60 * 60 * 1000;
    const startTime = now - rangeMs;
    
    const startIndex = sourceData.findIndex(d => d.timestamp >= startTime);
    
    if (startIndex === -1) {
      setZoomRange([0, 100]);
    } else {
      const startPercentage = (startIndex / sourceData.length) * 100;
      setZoomRange([startPercentage, 100]);
    }
  }, [fullDayData, history]);

  useEffect(() => {
    applyZoom();
  }, [applyZoom, zoomRange, fullDayData, history]);

  useEffect(() => {
    if (fullDayData.length > 0) {
      applyZoom();
    } else if (history.length > 0) {
      const transformedData: ChartDataPoint[] = history.map((item: ShellyEMData) => {
        const date = new Date(item.timestamp);
        const grid = Math.round(item.power);
        const production = Math.round(item.pv_power || 0);
        const consumption = grid + production;
        
        return {
          time: format(date, 'HH:mm', { locale: fr }),
          timestamp: date.getTime(),
          consumption,
          production,
          grid,
          voltage: item.voltage ? Math.round(item.voltage * 10) / 10 : undefined
        };
      });

      setChartData(transformedData);
    }
  }, [history, fullDayData, applyZoom]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!chartContainerRef.current) return;
    
    e.preventDefault();
    
    const delta = e.deltaY;
    const zoomDirection = delta > 0 ? 1 : -1;
    
    const currentRangeWidth = zoomRange[1] - zoomRange[0];
    const newRangeWidth = Math.max(
      5,
      Math.min(100, currentRangeWidth + (zoomDirection * 5))
    );
    
    if (newRangeWidth === 100) {
      setZoomRange([0, 100]);
      return;
    }
    
    const rect = chartContainerRef.current.getBoundingClientRect();
    const mouseXRatio = (e.clientX - rect.left) / rect.width;
    
    const rangeCenter = zoomRange[0] + (currentRangeWidth * mouseXRatio);
    
    const newStart = Math.max(0, rangeCenter - (newRangeWidth / 2));
    const newEnd = Math.min(100, newStart + newRangeWidth);
    
    if (newEnd === 100) {
      setZoomRange([100 - newRangeWidth, 100]);
    } else if (newStart === 0) {
      setZoomRange([0, newRangeWidth]);
    } else {
      setZoomRange([newStart, newEnd]);
    }
  }, [zoomRange]);

  const calculateYAxisDomain = useCallback(() => {
    if (chartData.length === 0) {
      return [-500, 3000];
    }
    
    const maxValue = Math.max(
      ...chartData.map(d => Math.max(
        showConsumption ? d.consumption : 0,
        showProduction ? d.production : 0,
        showGrid ? Math.abs(d.grid) : 0
      ))
    );
    
    const minValue = Math.min(
      ...chartData.map(d => Math.min(
        showGrid ? d.grid : 0
      ))
    );
    
    return [minValue < 0 ? 1.1 * minValue : -100, 1.1 * maxValue];
  }, [chartData, showConsumption, showProduction, showGrid]);

  const calculateVoltageYAxisDomain = useCallback(() => {
    if (chartData.length === 0 || !showVoltage) {
      return [220, 240];
    }

    const voltageValues = chartData
      .map(d => d.voltage)
      .filter(v => v !== undefined) as number[];
    
    if (voltageValues.length === 0) {
      return [220, 240];
    }
    
    const minVoltage = Math.min(...voltageValues);
    const maxVoltage = Math.max(...voltageValues);
    
    const padding = (maxVoltage - minVoltage) * 0.1;
    return [
      Math.floor(minVoltage - padding), 
      Math.ceil(maxVoltage + padding)
    ];
  }, [chartData, showVoltage]);

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
              <span className="font-medium">
                {`${Math.abs(Math.round(entry.value))}`}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const fontStyle = {
    fontFamily: 'system-ui, sans-serif',
    fontSize: 12,
    fontWeight: 'normal'
  };

  const axisLabelStyle = {
    ...fontStyle,
    fontSize: 14,
    textAnchor: 'middle',
  };

  const resetZoom = () => {
    setZoomRange([0, 100]);
    setZoomTimeRange('all');
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    resetZoom();
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
            <DateSelector 
              date={selectedDate}
              onDateChange={handleDateChange}
              className="mr-4"
            />
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
            <Toggle 
              pressed={showVoltage} 
              onPressedChange={setShowVoltage}
              className={`${showVoltage ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100' : ''}`}
            >
              <Zap className="w-3 h-3 text-[#9b87f5] mr-2" />
              Tension
            </Toggle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ZoomIn size={16} className="text-muted-foreground" />
            <Select value={zoomTimeRange} onValueChange={setZoomByTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Période d'affichage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Dernière heure</SelectItem>
                <SelectItem value="3h">3 dernières heures</SelectItem>
                <SelectItem value="6h">6 dernières heures</SelectItem>
                <SelectItem value="12h">12 dernières heures</SelectItem>
                <SelectItem value="24h">Journée complète</SelectItem>
                <SelectItem value="all">Tout afficher</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 mx-4 flex gap-2 items-center">
            <ZoomOut size={16} className="text-muted-foreground" />
            <Slider 
              min={0} 
              max={95} 
              step={5} 
              value={[zoomRange[0]]} 
              onValueChange={(values) => {
                const rangeWidth = zoomRange[1] - zoomRange[0];
                setZoomRange([values[0], Math.min(100, values[0] + rangeWidth)]);
              }} 
              className="mx-2" 
            />
            <ZoomIn size={16} className="text-muted-foreground" />
          </div>
          <button 
            onClick={resetZoom} 
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted hover:bg-muted/80 transition-colors"
          >
            <RefreshCw size={14} />
            <span className="text-sm">Réinitialiser</span>
          </button>
        </div>

        <div 
          className="h-[400px] w-full" 
          ref={chartContainerRef}
          onWheel={handleWheel}
        >
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
                  <linearGradient id="colorVoltage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9b87f5" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#9b87f5" stopOpacity={0.1}/>
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
                  yAxisId="power"
                  domain={calculateYAxisDomain()}
                  tickFormatter={(value) => `${Math.round(value)}`}
                  tick={fontStyle}
                />
                {showVoltage && (
                  <YAxis 
                    yAxisId="voltage"
                    orientation="right"
                    domain={calculateVoltageYAxisDomain()}
                    tickFormatter={(value) => `${Math.round(value)} V`}
                    tick={fontStyle}
                  />
                )}
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine yAxisId="power" y={0} stroke="#666" strokeDasharray="3 3" />
                
                {showGrid && (
                  <Area
                    type="monotone"
                    dataKey="grid"
                    name="Réseau"
                    yAxisId="power"
                    fill="url(#colorGridPos)"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                  />
                )}
                
                {showProduction && (
                  <Area
                    type="monotone"
                    dataKey="production"
                    name="Production"
                    yAxisId="power"
                    fill="url(#colorProduction)"
                    stroke="#00FF59"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                  />
                )}
                
                {showConsumption && (
                  <Area
                    type="monotone"
                    dataKey="consumption"
                    name="Consommation"
                    yAxisId="power"
                    fill="url(#colorConsumption)"
                    stroke="#F97415"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                  />
                )}

                {showVoltage && (
                  <Line
                    type="monotone"
                    dataKey="voltage"
                    name="Tension"
                    yAxisId="voltage"
                    stroke="#9b87f5"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 2 }}
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
      </CardContent>
    </Card>
  );
}
