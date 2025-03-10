import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { 
  CartesianGrid, Tooltip, 
  ResponsiveContainer, Area, ComposedChart, ReferenceLine, Line, XAxis, YAxis,
  ReferenceDot, Label
} from 'recharts';
import { ShellyEMData } from '@/lib/types';
import { Zap, Plug, Sun, CircuitBoard } from 'lucide-react';
import { EnergyChartWrapper } from './EnergyChartWrapper';
import { ChartSeriesToggle } from './ChartSeriesToggle';
import { CustomChartTooltip } from './CustomChartTooltip';
import { useEnergyChartData } from '@/hooks/useEnergyChartData';

interface HistoricalEnergyChartProps {
  history: ShellyEMData[];
  configId?: string | null;
}

export default function HistoricalEnergyChart({ history, configId }: HistoricalEnergyChartProps) {
  // Toggle visibility of lines - consumption and production are now true by default
  const [showConsumption, setShowConsumption] = useState(true);
  const [showProduction, setShowProduction] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showVoltage, setShowVoltage] = useState(false);
  
  // Maintain fixed domain state to prevent zoom resets
  const [fixedYDomain, setFixedYDomain] = useState<[number, number] | null>(null);
  const [fixedVoltageDomain, setFixedVoltageDomain] = useState<[number, number] | null>(null);

  // Use the extracted hook for data processing
  const { 
    chartData, 
    isLoadingFullDay,
    calculateYAxisDomain,
    calculateVoltageYAxisDomain
  } = useEnergyChartData(history, configId || null);

  // Maximum values for each data series
  const [maxConsumption, setMaxConsumption] = useState<{ value: number, index: number } | null>(null);
  const [maxProduction, setMaxProduction] = useState<{ value: number, index: number } | null>(null);
  const [maxExport, setMaxExport] = useState<{ value: number, index: number } | null>(null);
  const [maxImport, setMaxImport] = useState<{ value: number, index: number } | null>(null);

  // Calculate and store domains once when data is first loaded
  useEffect(() => {
    if (chartData.length > 0 && !fixedYDomain) {
      const domain = calculateYAxisDomain(showConsumption, showProduction, showGrid);
      setFixedYDomain(domain);
    }
    
    if (chartData.length > 0 && !fixedVoltageDomain && showVoltage) {
      const voltageDomain = calculateVoltageYAxisDomain(showVoltage);
      setFixedVoltageDomain(voltageDomain);
    }
  }, [chartData, fixedYDomain, fixedVoltageDomain, showConsumption, showProduction, showGrid, showVoltage, calculateYAxisDomain, calculateVoltageYAxisDomain]);

  // Update domains when toggles change
  useEffect(() => {
    const domain = calculateYAxisDomain(showConsumption, showProduction, showGrid);
    setFixedYDomain(domain);
  }, [showConsumption, showProduction, showGrid, calculateYAxisDomain]);
  
  useEffect(() => {
    const voltageDomain = calculateVoltageYAxisDomain(showVoltage);
    setFixedVoltageDomain(voltageDomain);
  }, [showVoltage, calculateVoltageYAxisDomain]);

  // Find maximum values for each curve - memoize to prevent recalculation on every render
  useEffect(() => {
    if (!chartData || chartData.length === 0) {
      setMaxConsumption(null);
      setMaxProduction(null);
      setMaxExport(null);
      setMaxImport(null);
      return;
    }

    // Find max consumption
    let maxConsIndex = 0;
    let maxCons = chartData[0].consumption;
    chartData.forEach((point, index) => {
      if (point.consumption > maxCons) {
        maxCons = point.consumption;
        maxConsIndex = index;
      }
    });
    setMaxConsumption({ value: maxCons, index: maxConsIndex });

    // Find max production
    let maxProdIndex = 0;
    let maxProd = chartData[0].production;
    chartData.forEach((point, index) => {
      if (point.production > maxProd) {
        maxProd = point.production;
        maxProdIndex = index;
      }
    });
    setMaxProduction({ value: maxProd, index: maxProdIndex });

    // Find max grid export (most negative)
    let maxExportIndex = 0;
    let maxExportVal = 0;
    chartData.forEach((point, index) => {
      if (point.grid < maxExportVal) {
        maxExportVal = point.grid;
        maxExportIndex = index;
      }
    });
    setMaxExport(maxExportVal !== 0 ? { value: maxExportVal, index: maxExportIndex } : null);

    // Find max grid import (most positive)
    let maxImportIndex = 0;
    let maxImportVal = 0;
    chartData.forEach((point, index) => {
      if (point.grid > maxImportVal) {
        maxImportVal = point.grid;
        maxImportIndex = index;
      }
    });
    setMaxImport(maxImportVal !== 0 ? { value: maxImportVal, index: maxImportIndex } : null);
  }, [chartData]);

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

  // Create the toggle controls for the chart with icons
  const renderChartControls = useCallback(() => {
    return (
      <>
        <ChartSeriesToggle 
          label="Consommation"
          value={showConsumption}
          onChange={setShowConsumption}
          color="#F97415"
          icon={<Plug className="w-3 h-3 text-[#F97415] mr-2" />}
        />
        <ChartSeriesToggle 
          label="Production"
          value={showProduction}
          onChange={setShowProduction}
          color="#00FF59"
          icon={<Sun className="w-3 h-3 text-[#00FF59] mr-2" />}
        />
        <ChartSeriesToggle 
          label="Réseau"
          value={showGrid}
          onChange={setShowGrid}
          color="blue-500"
          icon={<CircuitBoard className="w-3 h-3 text-blue-500 mr-2" />}
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
    if (!chartData || chartData.length === 0) {
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
            <linearGradient id="colorGrid" x1="0" y1="0" x2="0" y2="1">
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
            domain={fixedYDomain || calculateYAxisDomain(showConsumption, showProduction, showGrid)}
            tickFormatter={(value) => `${Math.round(value)} W`}
            tick={fontStyle}
          />
          {showVoltage && (
            <YAxis 
              yAxisId="voltage"
              orientation="right"
              domain={fixedVoltageDomain || calculateVoltageYAxisDomain(showVoltage)}
              tickFormatter={(value) => `${Math.round(value)} V`}
              tick={fontStyle}
            />
          )}
          <Tooltip content={<CustomChartTooltip />} />
          <ReferenceLine yAxisId="power" y={0} stroke="#666" strokeDasharray="3 3" />
          
          {showGrid && (
            <>
              {/* Grid import (positive values) */}
              <Area
                type="monotone"
                dataKey={(dataPoint) => dataPoint.grid > 0 ? dataPoint.grid : 0}
                name="Réseau (Import)"
                yAxisId="power"
                fill="url(#colorGrid)"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 2 }}
                connectNulls={true}
              />
              
              {/* Grid export (negative values) - now using the same color as import */}
              <Area
                type="monotone"
                dataKey={(dataPoint) => dataPoint.grid < 0 ? dataPoint.grid : null}
                name="Réseau (Export)"
                yAxisId="power"
                fill="url(#colorGrid)"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 2 }}
                connectNulls={true}
              />
              
              {/* Max export value marker */}
              {maxExport && maxExport.index >= 0 && chartData[maxExport.index] && (
                <ReferenceDot 
                  x={chartData[maxExport.index].time} 
                  y={maxExport.value} 
                  yAxisId="power"
                  r={6} 
                  fill="#3b82f6" 
                  stroke="#fff"
                  strokeWidth={2}
                >
                  <Label 
                    value={`${Math.abs(maxExport.value).toFixed(0)}W`} 
                    position="top" 
                    fill="#3b82f6"
                    fontSize={12}
                    fontWeight="bold"
                    offset={10}
                  />
                </ReferenceDot>
              )}
              
              {/* Max import value marker */}
              {maxImport && maxImport.index >= 0 && chartData[maxImport.index] && (
                <ReferenceDot 
                  x={chartData[maxImport.index].time} 
                  y={maxImport.value} 
                  yAxisId="power"
                  r={6} 
                  fill="#3b82f6" 
                  stroke="#fff"
                  strokeWidth={2}
                >
                  <Label 
                    value={`${maxImport.value.toFixed(0)}W`} 
                    position="top" 
                    fill="#3b82f6"
                    fontSize={12}
                    fontWeight="bold"
                    offset={10}
                  />
                </ReferenceDot>
              )}
            </>
          )}
          
          {showProduction && (
            <>
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
              
              {/* Max production marker */}
              {maxProduction && maxProduction.index >= 0 && chartData[maxProduction.index] && (
                <ReferenceDot 
                  x={chartData[maxProduction.index].time} 
                  y={maxProduction.value} 
                  yAxisId="power"
                  r={6} 
                  fill="#00FF59" 
                  stroke="#fff"
                  strokeWidth={2}
                >
                  <Label 
                    value={`${maxProduction.value.toFixed(0)}W`} 
                    position="top" 
                    fill="#00FF59"
                    fontSize={12}
                    fontWeight="bold"
                    offset={10}
                  />
                </ReferenceDot>
              )}
            </>
          )}
          
          {showConsumption && (
            <>
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
              
              {/* Max consumption marker */}
              {maxConsumption && maxConsumption.index >= 0 && chartData[maxConsumption.index] && (
                <ReferenceDot 
                  x={chartData[maxConsumption.index].time} 
                  y={maxConsumption.value} 
                  yAxisId="power"
                  r={6} 
                  fill="#F97415" 
                  stroke="#fff"
                  strokeWidth={2}
                >
                  <Label 
                    value={`${maxConsumption.value.toFixed(0)}W`} 
                    position="top" 
                    fill="#F97415"
                    fontSize={12}
                    fontWeight="bold"
                    offset={10}
                  />
                </ReferenceDot>
              )}
            </>
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

