
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { ShellyEMData } from '@/lib/types';
import { Group } from '@visx/group';
import { LinePath, Line, Bar, AreaClosed } from '@visx/shape';
import { scaleLinear, scaleTime } from '@visx/scale';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { GridRows, GridColumns } from '@visx/grid';
import { LinearGradient } from '@visx/gradient';
import { curveBasis, curveMonotoneX } from '@visx/curve';
import { TooltipWithBounds } from '@visx/tooltip';
import { ChartDataPoint } from '@/hooks/energy-chart/types';
import { EnergyChartWrapper } from './EnergyChartWrapper';
import { useEnergyChartData } from '@/hooks/energy-chart/useEnergyChartData';
import { ChartControls } from './ChartControls';
import { ChartTooltipContent } from './ChartTooltipContent';
import { useChartTooltip } from '@/hooks/energy-chart/useChartTooltip';

interface VisxEnergyChartProps {
  history: ShellyEMData[];
  configId?: string | null;
  className?: string;
}

// Define margin for the chart
const margin = { top: 20, right: 30, bottom: 50, left: 50 };

const VisxEnergyChart = ({ history, configId, className }: VisxEnergyChartProps) => {
  const [showConsumption, setShowConsumption] = useState(true);
  const [showProduction, setShowProduction] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showVoltage, setShowVoltage] = useState(false);
  const [showClearSky, setShowClearSky] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const { 
    chartData, 
    isLoadingFullDay,
    calculateYAxisDomain,
    calculateVoltageYAxisDomain
  } = useEnergyChartData(history, configId || null);

  // Update dimensions when container size changes
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const innerWidth = dimensions.width - margin.left - margin.right;
  const innerHeight = dimensions.height - margin.top - margin.bottom;

  // Create scales for time domain from midnight to current time
  const timeScale = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const now = chartData.length > 0 
      ? new Date(chartData[chartData.length - 1].timestamp)
      : new Date();
      
    return scaleTime<number>({
      domain: [today, now],
      range: [0, innerWidth],
    });
  }, [chartData, innerWidth]);

  const powerDomain = calculateYAxisDomain(showConsumption, showProduction, showGrid);
  const powerScale = scaleLinear<number>({
    domain: powerDomain,
    range: [innerHeight, 0],
    nice: true,
  });

  const voltageDomain = calculateVoltageYAxisDomain(showVoltage);
  const voltageScale = scaleLinear<number>({
    domain: voltageDomain,
    range: [innerHeight, 0],
    nice: true,
  });

  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    tooltipOpen,
    cursorPosition,
    handleTooltip,
    hideTooltip
  } = useChartTooltip({
    chartData,
    timeScale,
    margin,
    dimensions: {
      width: innerWidth,
      height: innerHeight
    }
  });

  return (
    <EnergyChartWrapper
      title="Historique de Consommation et Production"
      description="Visualisation des données énergétiques"
      className={className}
      controls={
        <ChartControls
          showConsumption={showConsumption}
          showProduction={showProduction}
          showGrid={showGrid}
          showVoltage={showVoltage}
          showClearSky={showClearSky}
          setShowConsumption={setShowConsumption}
          setShowProduction={setShowProduction}
          setShowGrid={setShowGrid}
          setShowVoltage={setShowVoltage}
          setShowClearSky={setShowClearSky}
        />
      }
    >
      <div ref={containerRef} className="w-full h-full relative">
        {dimensions.width > 0 && dimensions.height > 0 && (
          <svg width={dimensions.width} height={dimensions.height}>
            <LinearGradient
              id="consumption-gradient"
              from="#F97415"
              fromOpacity={0.5}
              to="#F97415"
              toOpacity={0.8}
            />
            <LinearGradient
              id="production-gradient"
              from="#00FF59"
              fromOpacity={0.5}
              to="#00FF59"
              toOpacity={0.8}
            />
            <LinearGradient
              id="grid-gradient"
              from="#42A5F5"
              fromOpacity={0.5}
              to="#42A5F5"
              toOpacity={0.8}
            />
            <LinearGradient
              id="grid-negative-gradient"
              from="#FF5252"
              fromOpacity={0.5}
              to="#FF5252"
              toOpacity={0.8}
            />
            <LinearGradient
              id="colorGridPos"
              from="#42A5F5"
              fromOpacity={0.5}
              to="#42A5F5"
              toOpacity={0.8}
            />
            
            <Group left={margin.left} top={margin.top}>
              <GridRows
                scale={powerScale}
                width={innerWidth}
                stroke="#e0e0e0"
                strokeOpacity={0.2}
                strokeDasharray="3,3"
              />
              <GridColumns
                scale={timeScale}
                height={innerHeight}
                stroke="#e0e0e0"
                strokeOpacity={0.2}
                strokeDasharray="3,3"
              />
              
              <line
                x1={0}
                y1={powerScale(0)}
                x2={innerWidth}
                y2={powerScale(0)}
                stroke="#888"
                strokeWidth={1}
                strokeDasharray="5,5"
              />
              
              <AxisLeft
                scale={powerScale}
                stroke="#888"
                tickStroke="#888"
                tickLabelProps={() => ({
                  fill: '#888',
                  fontSize: 10,
                  textAnchor: 'end',
                  dy: '0.33em',
                  dx: '-0.33em',
                })}
                label="Puissance (W)"
                labelProps={{
                  fill: '#888',
                  fontSize: 12,
                  textAnchor: 'middle',
                  dx: -35,
                }}
              />
              
              <AxisBottom
                top={innerHeight}
                scale={timeScale}
                stroke="#888"
                tickStroke="#888"
                tickLabelProps={() => ({
                  fill: '#888',
                  fontSize: 10,
                  textAnchor: 'middle',
                })}
                tickFormat={(date) => {
                  const d = new Date(date as Date);
                  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                }}
                numTicks={6}
              />
              
              {showVoltage && (
                <g transform={`translate(${innerWidth}, 0)`}>
                  <AxisLeft
                    scale={voltageScale}
                    stroke="#9b87f5"
                    tickStroke="#9b87f5"
                    orientation="right"
                    tickLabelProps={() => ({
                      fill: '#9b87f5',
                      fontSize: 10,
                      textAnchor: 'start',
                      dy: '0.33em',
                      dx: '0.33em',
                    })}
                    label="Tension (V)"
                    labelProps={{
                      fill: '#9b87f5',
                      fontSize: 12,
                      textAnchor: 'middle',
                      dx: 35,
                    }}
                  />
                </g>
              )}
              
              {showConsumption && chartData.length > 0 && (
                <AreaClosed
                  data={chartData.filter(d => d.consumption >= 0)}
                  x={d => timeScale(d.timestamp)}
                  y={d => powerScale(Math.max(0, d.consumption))}
                  y0={() => powerScale(0)}
                  yScale={powerScale}
                  fill="url(#consumption-gradient)"
                  curve={curveMonotoneX}
                />
              )}
              
              {showProduction && chartData.length > 0 && (
                <AreaClosed
                  data={chartData.filter(d => d.production >= 0)}
                  x={d => timeScale(d.timestamp)}
                  y={d => powerScale(Math.max(0, d.production))}
                  y0={() => powerScale(0)}
                  yScale={powerScale}
                  fill="url(#production-gradient)"
                  curve={curveMonotoneX}
                />
              )}
              
              {showGrid && chartData.length > 0 && (
                <AreaClosed
                  data={chartData.filter(d => d.grid >= 0)}
                  x={d => timeScale(d.timestamp)}
                  y={d => powerScale(Math.max(0, d.grid))}
                  yScale={powerScale}
                  fill="url(#colorGridPos)"
                  curve={curveMonotoneX}
                />
              )}
              
              {showGrid && chartData.length > 0 && (
                <AreaClosed
                  data={chartData.filter(d => d.grid <= 0)}
                  x={d => timeScale(d.timestamp)}
                  y={d => powerScale(0)}
                  y0={d => powerScale(d.grid)}
                  yScale={powerScale}
                  fill="url(#grid-negative-gradient)"
                  curve={curveMonotoneX}
                />
              )}
              
              {showVoltage && chartData.length > 0 && (
                <LinePath
                  data={chartData.filter(d => d.voltage !== undefined && d.voltage > 0)}
                  x={d => timeScale(d.timestamp)}
                  y={d => voltageScale(d.voltage || 0)}
                  stroke="#9b87f5"
                  strokeWidth={2}
                  curve={curveMonotoneX}
                  strokeDasharray="4,2"
                />
              )}
              
              {showClearSky && chartData.length > 0 && (
                <>
                  <LinePath
                    data={chartData.filter(d => d.clearSkyProduction !== undefined && d.clearSkyProduction > 0)}
                    x={d => timeScale(d.timestamp)}
                    y={d => powerScale(d.clearSkyProduction || 0)}
                    stroke="#D4E157"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    curve={curveBasis}
                  />
                </>
              )}
              
              <Bar
                width={innerWidth}
                height={innerHeight}
                fill="transparent"
                onTouchStart={handleTooltip}
                onTouchMove={handleTooltip}
                onMouseMove={handleTooltip}
                onMouseLeave={hideTooltip}
              />
            </Group>

            {cursorPosition && (
              <line
                x1={cursorPosition.x}
                y1={margin.top}
                x2={cursorPosition.x}
                y2={cursorPosition.y - margin.bottom}
                stroke="#666"
                strokeWidth={1}
                strokeDasharray="4,4"
                pointerEvents="none"
              />
            )}
          </svg>
        )}
        
        {tooltipOpen && tooltipData && (
          <TooltipWithBounds
            key={Math.random()}
            top={tooltipTop}
            left={tooltipLeft}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg p-3"
            style={{
              width: 'auto',
              maxWidth: '160px',
              transform: 'translate(0, -100%)'
            }}
          >
            <ChartTooltipContent
              tooltipData={tooltipData}
              showConsumption={showConsumption}
              showProduction={showProduction}
              showGrid={showGrid}
              showVoltage={showVoltage}
              showClearSky={showClearSky}
            />
          </TooltipWithBounds>
        )}
      </div>
    </EnergyChartWrapper>
  );
};

export default VisxEnergyChart;
