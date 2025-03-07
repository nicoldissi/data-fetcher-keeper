
import { useState, useCallback } from 'react';
import { 
  CartesianGrid, Tooltip, 
  ResponsiveContainer, Area, ComposedChart, ReferenceLine, Line, XAxis, YAxis
} from 'recharts';
import { ShellyEMData } from '@/lib/types';
import { Zap } from 'lucide-react';
import { EnergyChartWrapper } from './EnergyChartWrapper';
import { ChartSeriesToggle } from './ChartSeriesToggle';
import { CustomChartTooltip } from './CustomChartTooltip';
import { useEnergyChartData } from '@/hooks/useEnergyChartData';
import { formatTimeForChart } from '@/lib/dateUtils';

interface HistoricalEnergyChartProps {
  history: ShellyEMData[];
  configId?: string | null;
}

export default function HistoricalEnergyChart({ history, configId }: HistoricalEnergyChartProps) {
  // Toggle visibility of lines
  const [showConsumption, setShowConsumption] = useState(true);
  const [showProduction, setShowProduction] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showVoltage, setShowVoltage] = useState(false);

  // Use the extracted hook for data processing
  const { 
    chartData, 
    isLoadingFullDay,
    calculateYAxisDomain,
    calculateVoltageYAxisDomain
  } = useEnergyChartData(history, configId || null);

  // Common font styling for the chart
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

  // Create the toggle controls for the chart
  const renderChartControls = useCallback(() => {
    return (
      <>
        <ChartSeriesToggle 
          label="Consommation"
          value={showConsumption}
          onChange={setShowConsumption}
          color="#F97415"
        />
        <ChartSeriesToggle 
          label="Production"
          value={showProduction}
          onChange={setShowProduction}
          color="#00FF59"
        />
        <ChartSeriesToggle 
          label="Réseau"
          value={showGrid}
          onChange={setShowGrid}
          color="blue-500"
        />
        <ChartSeriesToggle 
          label="Tension"
          value={showVoltage}
          onChange={setShowVoltage}
          color="#9b87f5"
          icon={<Zap className="w-3 h-3 text-[#9b87f5] mr-2" />}
        />
      </>
    );
  }, [showConsumption, showProduction, showGrid, showVoltage]);

  // Render the main chart content
  const renderChartContent = () => {
    if (chartData.length === 0) {
      return null;
    }

    return (
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
            domain={calculateYAxisDomain(showConsumption, showProduction, showGrid)}
            tickFormatter={(value) => `${Math.round(value)} W`}
            tick={fontStyle}
          />
          {showVoltage && (
            <YAxis 
              yAxisId="voltage"
              orientation="right"
              domain={calculateVoltageYAxisDomain(showVoltage)}
              tickFormatter={(value) => `${Math.round(value)} V`}
              tick={fontStyle}
            />
          )}
          <Tooltip content={<CustomChartTooltip />} />
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
    );
  };

  return (
    <EnergyChartWrapper
      title="Historique de Consommation et Production"
      description="Évolution de la consommation et production d'énergie"
      controls={renderChartControls()}
      isLoading={isLoadingFullDay && chartData.length === 0}
    >
      {renderChartContent()}
    </EnergyChartWrapper>
  );
}
