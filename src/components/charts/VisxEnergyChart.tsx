import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { ShellyEMData } from '@/lib/types';
import { Zap, Plug, Sun, CircuitBoard } from 'lucide-react';
import { EnergyChartWrapper } from './EnergyChartWrapper';
import { ChartSeriesToggle } from './ChartSeriesToggle';
import { useEnergyChartData } from '@/hooks/useEnergyChartData';

// ViSX imports
import { Group } from '@visx/group';
import { LinePath, AreaClosed, Bar } from '@visx/shape';
import { scaleTime, scaleLinear } from '@visx/scale';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { GridRows, GridColumns } from '@visx/grid';
import { Tooltip, useTooltip, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { LinearGradient } from '@visx/gradient';
import { curveMonotoneX, curveCardinal } from '@visx/curve';

interface VisxEnergyChartProps {
  history: ShellyEMData[];
  configId?: string | null;
}

// Define margin for the chart
const margin = { top: 20, right: 30, bottom: 50, left: 50 };

// We'll use custom tooltip styling with Tailwind classes instead of these styles
// This comment is kept for reference

export default function VisxEnergyChart({ history, configId }: VisxEnergyChartProps) {
  // Toggle visibility of lines
  const [showConsumption, setShowConsumption] = useState(true);
  const [showProduction, setShowProduction] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showVoltage, setShowVoltage] = useState(false);
  const [showClearSky, setShowClearSky] = useState(true);

  // Reference for the chart container
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Use the extracted hook for data processing
  const { 
    chartData, 
    isLoadingFullDay,
    calculateYAxisDomain,
    calculateVoltageYAxisDomain
  } = useEnergyChartData(history, configId || null);

  // Set up tooltip
  const [tooltipData, setTooltipData] = useState<any>(null);
  const [tooltipLeft, setTooltipLeft] = useState<number>(0);
  const [tooltipTop, setTooltipTop] = useState<number>(0);
  const [tooltipOpen, setTooltipOpen] = useState<boolean>(false);

  // Reference for the tooltip container
  const tooltipRef = useRef<HTMLDivElement>(null);

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

  // Calculate chart area dimensions
  const innerWidth = dimensions.width - margin.left - margin.right;
  const innerHeight = dimensions.height - margin.top - margin.bottom;

  // Create scales
  const timeScale = scaleTime<number>({
    domain: chartData.length > 0 
      ? [new Date(chartData[0].timestamp), new Date(chartData[chartData.length - 1].timestamp)]
      : [new Date(), new Date()],
    range: [0, innerWidth],
  });

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

  // Accessor functions
  const getX = (d: any) => new Date(d.timestamp);
  const getConsumption = (d: any) => d.consumption;
  const getProduction = (d: any) => d.production;
  const getGrid = (d: any) => d.grid;
  const getVoltage = (d: any) => d.voltage || 0;
  const getClearSkyProduction = (d: any) => d.clearSkyProduction || 0;

  // Throttle function to limit the rate of tooltip updates
  const throttle = useCallback((func: Function, limit: number) => {
    let inThrottle: boolean;
    let lastResult: any;
    return function(this: any, ...args: any[]) {
      if (!inThrottle) {
        lastResult = func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
      return lastResult;
    };
  }, []);

  // Handle tooltip with throttling to reduce render load
  const handleTooltip = useCallback(
    throttle((event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>) => {
      if (!chartData.length) return;

      const { x, y } = localPoint(event) || { x: 0, y: 0 };
      const x0 = timeScale.invert(x - margin.left);
      
      // Find the closest data point using binary search for better performance
      let closestIndex = 0;
      let minDistance = Infinity;
      
      // Optimize the search for closest point
      for (let i = 0; i < chartData.length; i++) {
        const distance = Math.abs(new Date(chartData[i].timestamp).getTime() - x0.getTime());
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = i;
        }
      }
      
      const dataPoint = chartData[closestIndex];
      
      // Calculate tooltip position relative to the chart container
      // Ensure the tooltip stays within the chart boundaries
      let tooltipWidth = 180; // Estimated tooltip width
      let tooltipHeight = 150; // Estimated tooltip height
      
      // Get screen dimensions
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      // Position tooltip near the cursor but ensure it stays within chart boundaries
      let tooltipLeft = x + tooltipWidth > dimensions.width
        ? x - tooltipWidth - 10 // Place to the left of cursor if it would overflow right edge
        : x + 10; // Otherwise place to the right of cursor
      
      // Position tooltip above or below cursor depending on available space
      let tooltipTop = y - tooltipHeight < margin.top
        ? y + 10 // Place below cursor if it would overflow top edge
        : y - tooltipHeight - 10; // Otherwise place above cursor
      
      // Final adjustments to ensure tooltip stays within chart boundaries
      let adjustedTooltipLeft = Math.max(margin.left, Math.min(tooltipLeft, dimensions.width - tooltipWidth - margin.right));
      let adjustedTooltipTop = Math.max(margin.top, Math.min(tooltipTop, dimensions.height - tooltipHeight - margin.bottom));

      // Adjust for screen boundaries
      adjustedTooltipLeft = Math.max(0, Math.min(adjustedTooltipLeft, screenWidth - tooltipWidth));
      adjustedTooltipTop = Math.max(0, Math.min(adjustedTooltipTop, screenHeight - tooltipHeight));

      setTooltipData(dataPoint);
      setTooltipLeft(adjustedTooltipLeft - tooltipWidth / 2);
      setTooltipTop(adjustedTooltipTop - tooltipHeight);
      setTooltipOpen(true);

      // Get tooltip dimensions
      if (tooltipRef.current) {
        const { width, height } = tooltipRef.current.getBoundingClientRect();
        tooltipWidth = width;
        tooltipHeight = height;

        // Calculate potential positions
        const positionAbove = {
          left: x - tooltipWidth / 2,
          top: y - tooltipHeight - 10,
        };
        const positionBelow = {
          left: x - tooltipWidth / 2,
          top: y + 10,
        };

        // Evaluate positions - check if they are within screen boundaries
        const isAboveVisible =
          positionAbove.left >= 0 &&
          positionAbove.left + tooltipWidth <= screenWidth &&
          positionAbove.top >= 0;
        const isBelowVisible =
          positionBelow.left >= 0 &&
          positionBelow.left + tooltipWidth <= screenWidth &&
          positionBelow.top + tooltipHeight <= screenHeight;

        // Choose best position
        let bestPosition = positionAbove;
        if (isBelowVisible && !isAboveVisible) {
          bestPosition = positionBelow;
        }

        // Adjust for screen boundaries
        adjustedTooltipLeft = 550;
        adjustedTooltipTop = 550;        
        //adjustedTooltipLeft = Math.max(0, Math.min(bestPosition.left, screenWidth - tooltipWidth));
        //adjustedTooltipTop = Math.max(0, Math.min(bestPosition.top, screenHeight - tooltipHeight));

        setTooltipLeft(adjustedTooltipLeft);
        setTooltipTop(adjustedTooltipTop);

        console.log("Tooltip dimensions:", { width: tooltipWidth, height: tooltipHeight });
        console.log("Calculated positions:", { adjustedTooltipLeft, adjustedTooltipTop });
      }
    }, 50), // 50ms throttle to smooth performance
    [chartData, timeScale, margin, dimensions, showConsumption, showProduction, showGrid, showClearSky, setTooltipData, setTooltipLeft, setTooltipTop, setTooltipOpen, tooltipRef]
  );

  const hideTooltip = useCallback(() => {
    setTooltipOpen(false);
  }, []);

  // Filter data for voltage and clear sky production
  const validVoltageData = chartData.filter(d => d.voltage !== undefined && d.voltage > 0);
  const validClearSkyData = chartData.filter(d => d.clearSkyProduction !== undefined && d.clearSkyProduction > 0);

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
        <ChartSeriesToggle 
          label="Production idéale"
          value={showClearSky}
          onChange={setShowClearSky}
          color="#D4E157"
          icon={<Sun className="w-3 h-3 text-[#D4E157] mr-2" />}
        />
      </>
    );
  }, [showConsumption, showProduction, showGrid, showVoltage, showClearSky]);

  return (
    <EnergyChartWrapper
      title="Historique de Consommation et Production"
      description="Évolution de la consommation et production d'énergie"
      controls={renderChartControls()}
      isLoading={isLoadingFullDay && chartData.length === 0}
    >
      <div ref={containerRef} className="w-full h-full">
        {dimensions.width > 0 && dimensions.height > 0 && (
          <svg width={dimensions.width} height={dimensions.height}>
            {/* Define gradients */}
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
            
            <Group left={margin.left} top={margin.top}>
              {/* Grid */}
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
              
              {/* Zero line */}
              <line
                x1={0}
                y1={powerScale(0)}
                x2={innerWidth}
                y2={powerScale(0)}
                stroke="#888"
                strokeWidth={1}
                strokeDasharray="5,5"
              />
              
              {/* Axes */}
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
                  dy: '0.33em',
                })}
                tickFormat={(date) => {
                  const d = new Date(date as Date);
                  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                }}
                numTicks={6}
              />
              
              {/* Right axis for voltage if enabled */}
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
              
              {/* Area charts - render without animations */}
              {showConsumption && chartData.length > 0 && (
                <AreaClosed
                  data={chartData.filter(d => getConsumption(d) >= 0)}
                  x={d => timeScale(getX(d))}
                  y={d => powerScale(Math.max(0, getConsumption(d)))}
                  y0={() => powerScale(0)}
                  yScale={powerScale}
                  fill="url(#consumption-gradient)"
                  curve={curveMonotoneX}
                />
              )}
              
              {showProduction && chartData.length > 0 && (
                <AreaClosed
                  data={chartData.filter(d => getProduction(d) >= 0)}
                  x={d => timeScale(getX(d))}
                  y={d => powerScale(Math.max(0, getProduction(d)))}
                  y0={() => powerScale(0)}
                  yScale={powerScale}
                  fill="url(#production-gradient)"
                  curve={curveMonotoneX}
                />
              )}
              
              {/* Grid area chart - positive values */}
              {showGrid && chartData.length > 0 && (
                <AreaClosed
                  data={chartData.filter(d => getGrid(d) >= 0)}
                  x={d => timeScale(getX(d))}
                  y={d => powerScale(Math.max(0, getGrid(d)))}
                  y0={() => powerScale(0)}
                  yScale={powerScale}
                  fill="url(#grid-gradient)"
                  curve={curveMonotoneX}
                />
              )}
              
              {/* Grid area chart - negative values */}
              {showGrid && chartData.length > 0 && (
                <AreaClosed
                  data={chartData.filter(d => getGrid(d) < 0)}
                  x={d => timeScale(getX(d))}
                  y={d => powerScale(0)}
                  y0={d => powerScale(getGrid(d))}
                  yScale={powerScale}
                  fill="url(#grid-negative-gradient)"
                  curve={curveMonotoneX}
                />
              )}
              
              {showVoltage && validVoltageData.length > 0 && (
                <LinePath
                  data={validVoltageData}
                  x={d => timeScale(getX(d))}
                  y={d => voltageScale(getVoltage(d))}
                  stroke="#9b87f5"
                  strokeWidth={2}
                  curve={curveMonotoneX}
                  strokeDasharray="4,2"
                />
              )}
              
              {/* Clear Sky Production line - with smoother curve */}
              {showClearSky && validClearSkyData.length > 0 && (
                <LinePath
                  data={validClearSkyData}
                  x={d => timeScale(getX(d))}
                  y={d => powerScale(getClearSkyProduction(d))}
                  stroke="#D4E157"
                  strokeWidth={3}
                  curve={curveCardinal.tension(0.7)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              
              {/* Overlay for tooltip */}
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
          </svg>
        )}
        
        {/* Custom Tooltip */}
        {tooltipOpen && tooltipData && (
          <div 
            className="absolute z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg p-3 pointer-events-none"
            style={{
              top: tooltipTop,
              left: tooltipLeft,
              maxWidth: '220px',
              transition: 'all 0.1s ease-out'
            }}
          >
            <div className="font-semibold mb-1 text-gray-900 dark:text-gray-100">{tooltipData.time}</div>
            <div className="space-y-1">
              {showConsumption && (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-[#F97415]"></div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">Consommation:</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{tooltipData.consumption} W</span>
                </div>
              )}
              {showProduction && (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-[#00FF59]"></div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">Production:</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{tooltipData.production} W</span>
                </div>
              )}
              {showGrid && (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-[#42A5F5]"></div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">Réseau:</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{tooltipData.grid} W</span>
                </div>
              )}
              {showVoltage && tooltipData.voltage && (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-[#9b87f5]"></div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">Tension:</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{tooltipData.voltage} V</span>
                </div>
              )}
              {showClearSky && tooltipData.clearSkyProduction !== undefined && (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-[#D4E157]"></div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">Production idéale:</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{tooltipData.clearSkyProduction} W</span>
                </div>
              )}
            </div>
            {/* Tooltip arrow */}
            <div 
              className="absolute w-3 h-3 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700 transform rotate-45"
              style={{
                bottom: '-6px',
                left: '50%',
                marginLeft: '-6px'
              }}
            />
          </div>
        )}
      </div>
    </EnergyChartWrapper>
  );
}