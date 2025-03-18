
import React, { useMemo } from 'react';
import { AreaClosed, Line, Bar, LinePath } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';
import { scaleLinear, scaleTime } from '@visx/scale';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { useTooltip, TooltipWithBounds } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { bisector } from 'd3-array';
import { Group } from '@visx/group';
import { ChartDataPoint } from '@/hooks/energy-chart/types';
import { formatLocalDate } from '@/lib/dateUtils';
import { ShellyConfig } from '@/lib/types';
import { LinePathProps } from '@visx/shape/lib/shapes/LinePath';
import { AreaClosedProps } from '@visx/shape/lib/shapes/AreaClosed';

// Define a type for data accessors that handles null/undefined values
type Accessor<T> = (d: T) => number | null | undefined;

// Define bisector for finding nearest data point, accounting for null/undefined values
const bisectDate = bisector<ChartDataPoint, Date>((d) => new Date(d.timestamp)).left;

// Helper function to determine if a value is defined and not null
const isDefined = <T,>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined;
};

// Extend the default path types to handle null/undefined values
type CustomLinePathProps<Datum> = Omit<LinePathProps<Datum>, 'y'> & {
  y: Accessor<Datum>;
};

type CustomAreaClosedProps<Datum> = Omit<AreaClosedProps<Datum>, 'y'> & {
  y: Accessor<Datum>;
};

// Custom LinePathComponent that skips null/undefined values
function CustomLinePath<Datum>({ 
  data, 
  x, 
  y, 
  curve,
  ...restProps 
}: CustomLinePathProps<Datum>) {
  // Filter out data points with null/undefined y values
  const validData = data.filter(d => isDefined(y(d)));
  
  return (
    <LinePath
      data={validData}
      x={x}
      y={y as any} // Cast is necessary because we've already filtered out null/undefined values
      curve={curve}
      {...restProps}
    />
  );
}

// Custom AreaClosed that skips null/undefined values
function CustomAreaClosed<Datum>({ 
  data, 
  x, 
  y, 
  curve,
  yScale,
  ...restProps 
}: CustomAreaClosedProps<Datum>) {
  // Filter out data points with null/undefined y values
  const validData = data.filter(d => isDefined(y(d)));
  
  return (
    <AreaClosed
      data={validData}
      x={x}
      y={y as any} // Cast is necessary because we've already filtered out null/undefined values
      curve={curve}
      yScale={yScale}
      {...restProps}
    />
  );
}

interface VisxEnergyChartProps {
  history: ChartDataPoint[];
  configId?: string | null;
  showConsumption?: boolean;
  showProduction?: boolean;
  showGrid?: boolean;
  showVoltage?: boolean;
  showClearSky?: boolean;
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  config?: ShellyConfig | null;
}

const VisxEnergyChart: React.FC<VisxEnergyChartProps> = ({
  history,
  configId,
  showConsumption = true,
  showProduction = true,
  showGrid = true,
  showVoltage = false,
  showClearSky = true,
  width = 800,
  height = 400,
  margin = { top: 20, right: 30, bottom: 50, left: 50 },
  config
}) => {
  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    tooltipOpen,
    showTooltip,
    hideTooltip
  } = useTooltip<ChartDataPoint>();

  // Sort history by timestamp to ensure correct rendering
  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => a.timestamp - b.timestamp);
  }, [history]);

  // Initialize colors
  const consumptionColor = '#F97415';
  const productionColor = '#00FF59';
  const gridColor = '#3b82f6';
  const voltageColor = '#9b87f5';
  const clearSkyColor = '#FFA726';

  // Determine the bounds for the chart
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  // Define accessors
  const getDate = (d: ChartDataPoint): Date => new Date(d.timestamp);
  const getConsumption = (d: ChartDataPoint): number | null => d.consumption !== undefined ? d.consumption : null;
  const getProduction = (d: ChartDataPoint): number | null => d.production !== undefined ? d.production : null;
  const getGrid = (d: ChartDataPoint): number | null => d.grid !== undefined ? d.grid : null;
  const getVoltage = (d: ChartDataPoint): number | null => d.voltage !== undefined ? d.voltage : null;
  const getClearSky = (d: ChartDataPoint): number | null => d.clearSkyProduction !== undefined ? d.clearSkyProduction : null;

  // Create scales
  const xScale = useMemo(
    () => {
      if (sortedHistory.length === 0) {
        // Default range for empty data
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        return scaleTime({
          domain: [oneHourAgo, now],
          range: [0, xMax],
        });
      }
      
      return scaleTime({
        domain: [
          getDate(sortedHistory[0]),
          getDate(sortedHistory[sortedHistory.length - 1])
        ],
        range: [0, xMax],
      });
    },
    [sortedHistory, xMax]
  );

  // Calculate the yScale domain based on visible series
  const yDomain = useMemo(() => {
    if (sortedHistory.length === 0) return [-500, 3000];

    let minValue = 0;
    let maxValue = 1000;

    if (showGrid) {
      const minGrid = Math.min(...sortedHistory.map(d => d.grid !== undefined ? d.grid : Infinity).filter(v => v !== Infinity));
      const maxGrid = Math.max(...sortedHistory.map(d => d.grid !== undefined ? d.grid : -Infinity).filter(v => v !== -Infinity));
      minValue = Math.min(minValue, minGrid);
      maxValue = Math.max(maxValue, maxGrid);
    }

    if (showConsumption) {
      const maxConsumption = Math.max(...sortedHistory.map(d => d.consumption !== undefined ? d.consumption : -Infinity).filter(v => v !== -Infinity));
      maxValue = Math.max(maxValue, maxConsumption);
    }

    if (showProduction) {
      const maxProduction = Math.max(...sortedHistory.map(d => d.production !== undefined ? d.production : -Infinity).filter(v => v !== -Infinity));
      maxValue = Math.max(maxValue, maxProduction);
    }

    if (showClearSky) {
      const maxClearSky = Math.max(...sortedHistory.map(d => d.clearSkyProduction !== undefined ? d.clearSkyProduction : -Infinity).filter(v => v !== -Infinity));
      maxValue = Math.max(maxValue, maxClearSky);
    }

    // Add padding to the range
    minValue = minValue < 0 ? minValue * 1.1 : minValue * 0.9;
    maxValue = maxValue * 1.1;

    return [minValue, maxValue];
  }, [sortedHistory, showConsumption, showProduction, showGrid, showClearSky]);

  const yScale = useMemo(
    () => scaleLinear({
      domain: yDomain,
      range: [yMax, 0],
    }),
    [yDomain, yMax]
  );

  // Separate scale for voltage
  const voltageScale = useMemo(() => {
    if (!showVoltage || sortedHistory.length === 0) {
      return scaleLinear({
        domain: [220, 240],
        range: [yMax, 0],
      });
    }

    const voltages = sortedHistory
      .map(d => d.voltage)
      .filter(v => v !== undefined) as number[];

    if (voltages.length === 0) {
      return scaleLinear({
        domain: [220, 240],
        range: [yMax, 0],
      });
    }

    const minVoltage = Math.min(...voltages);
    const maxVoltage = Math.max(...voltages);
    const padding = (maxVoltage - minVoltage) * 0.1;

    return scaleLinear({
      domain: [
        Math.floor(minVoltage - padding),
        Math.ceil(maxVoltage + padding)
      ],
      range: [yMax, 0],
    });
  }, [sortedHistory, yMax, showVoltage]);

  // Tooltip handler
  const handleTooltip = (event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>) => {
    if (!sortedHistory.length) return;

    const { x } = localPoint(event) || { x: 0 };
    const x0 = xScale.invert(x - margin.left);
    const index = bisectDate(sortedHistory, x0, 1);
    const d0 = sortedHistory[index - 1];
    const d1 = sortedHistory[index];
    
    if (!d0 || !d1) return;
    
    // Calculate which datapoint is closer to the mouse
    const d = x0.getTime() - getDate(d0).getTime() > getDate(d1).getTime() - x0.getTime() ? d1 : d0;
    
    showTooltip({
      tooltipData: d,
      tooltipLeft: xScale(getDate(d)) + margin.left,
      tooltipTop: yScale(getConsumption(d) || 0) + margin.top,
    });
  };

  // Format time for tooltip
  const formatTooltipTime = (timestamp: number): string => {
    return formatLocalDate(timestamp, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: 'numeric',
      month: 'short',
      hour12: false
    });
  };

  return (
    <div style={{ position: 'relative' }}>
      <svg width={width} height={height}>
        <Group left={margin.left} top={margin.top}>
          <GridRows
            scale={yScale}
            width={xMax}
            strokeDasharray="3,3"
            stroke="#e0e0e0"
            strokeOpacity={0.2}
            pointerEvents="none"
          />
          
          <AxisLeft
            scale={yScale}
            stroke="#888"
            tickStroke="#888"
            tickLabelProps={() => ({
              fill: '#888',
              fontSize: 10,
              textAnchor: 'end',
              dy: '0.33em',
              dx: -4
            })}
          />
          
          <AxisBottom
            top={yMax}
            scale={xScale}
            stroke="#888"
            tickStroke="#888"
            tickLabelProps={() => ({
              fill: '#888',
              fontSize: 10,
              textAnchor: 'middle',
              dy: '0.33em',
              y: 9
            })}
            numTicks={5}
          />
          
          {showGrid && (
            <CustomAreaClosed
              data={sortedHistory}
              x={(d) => xScale(getDate(d))}
              y={(d) => {
                const value = getGrid(d);
                return value !== null ? yScale(value) : null;
              }}
              yScale={yScale}
              fill={`url(#grid-gradient)`}
              stroke={gridColor}
              strokeWidth={2}
              curve={curveMonotoneX}
            />
          )}
          
          {showProduction && (
            <CustomAreaClosed
              data={sortedHistory}
              x={(d) => xScale(getDate(d))}
              y={(d) => {
                const value = getProduction(d);
                return value !== null ? yScale(value) : null;
              }}
              yScale={yScale}
              fill={`url(#production-gradient)`}
              stroke={productionColor}
              strokeWidth={2}
              curve={curveMonotoneX}
            />
          )}
          
          {showConsumption && (
            <CustomAreaClosed
              data={sortedHistory}
              x={(d) => xScale(getDate(d))}
              y={(d) => {
                const value = getConsumption(d);
                return value !== null ? yScale(value) : null;
              }}
              yScale={yScale}
              fill={`url(#consumption-gradient)`}
              stroke={consumptionColor}
              strokeWidth={2}
              curve={curveMonotoneX}
            />
          )}
          
          {showClearSky && (
            <CustomLinePath
              data={sortedHistory}
              x={(d) => xScale(getDate(d))}
              y={(d) => {
                const value = getClearSky(d);
                return value !== null ? yScale(value) : null;
              }}
              stroke={clearSkyColor}
              strokeWidth={2}
              strokeDasharray="4,4"
              curve={curveMonotoneX}
            />
          )}
          
          {showVoltage && (
            <CustomLinePath
              data={sortedHistory}
              x={(d) => xScale(getDate(d))}
              y={(d) => {
                const value = getVoltage(d);
                return value !== null ? voltageScale(value) : null;
              }}
              stroke={voltageColor}
              strokeWidth={2}
              curve={curveMonotoneX}
            />
          )}
          
          <Bar
            x={0}
            y={0}
            width={xMax}
            height={yMax}
            fill="transparent"
            onTouchStart={handleTooltip}
            onTouchMove={handleTooltip}
            onMouseMove={handleTooltip}
            onMouseLeave={hideTooltip}
          />
          
          {/* Define gradients for fills */}
          <defs>
            <linearGradient id="consumption-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={consumptionColor} stopOpacity={0.6} />
              <stop offset="100%" stopColor={consumptionColor} stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="production-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={productionColor} stopOpacity={0.6} />
              <stop offset="100%" stopColor={productionColor} stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="grid-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={gridColor} stopOpacity={0.6} />
              <stop offset="100%" stopColor={gridColor} stopOpacity={0.1} />
            </linearGradient>
          </defs>
        </Group>
      </svg>
      
      {tooltipOpen && tooltipData && tooltipLeft != null && tooltipTop != null && (
        <TooltipWithBounds
          key={Math.random()}
          top={tooltipTop - 10}
          left={tooltipLeft + 10}
          style={{
            backgroundColor: 'white',
            color: 'black',
            padding: '8px',
            borderRadius: '4px',
            boxShadow: '0px 2px 10px rgba(0,0,0,0.25)',
            fontSize: '12px',
            fontWeight: 500,
            pointerEvents: 'none'
          }}
        >
          <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>
            {formatTooltipTime(tooltipData.timestamp)}
          </div>
          {showConsumption && tooltipData.consumption !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', margin: '2px 0' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: consumptionColor,
                  marginRight: '4px',
                  borderRadius: '50%'
                }}
              />
              <span>Consommation: {Math.round(tooltipData.consumption)} W</span>
            </div>
          )}
          {showProduction && tooltipData.production !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', margin: '2px 0' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: productionColor,
                  marginRight: '4px',
                  borderRadius: '50%'
                }}
              />
              <span>Production: {Math.round(tooltipData.production)} W</span>
            </div>
          )}
          {showGrid && tooltipData.grid !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', margin: '2px 0' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: gridColor,
                  marginRight: '4px',
                  borderRadius: '50%'
                }}
              />
              <span>Réseau: {Math.round(tooltipData.grid)} W</span>
            </div>
          )}
          {showVoltage && tooltipData.voltage !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', margin: '2px 0' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: voltageColor,
                  marginRight: '4px',
                  borderRadius: '50%'
                }}
              />
              <span>Tension: {tooltipData.voltage.toFixed(1)} V</span>
            </div>
          )}
          {showClearSky && tooltipData.clearSkyProduction !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', margin: '2px 0' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: clearSkyColor,
                  marginRight: '4px',
                  borderRadius: '50%'
                }}
              />
              <span>Production idéale: {Math.round(tooltipData.clearSkyProduction)} W</span>
            </div>
          )}
        </TooltipWithBounds>
      )}
    </div>
  );
};

export default VisxEnergyChart;

