
import { useState, useCallback } from 'react';
import { localPoint } from '@visx/event';
import { ChartDataPoint } from './types';
import { ScaleTime } from 'd3-scale';

interface UseChartTooltipProps {
  chartData: ChartDataPoint[];
  timeScale: ScaleTime<number, number>;
  margin: { left: number };
  dimensions: { height: number; width: number };
}

export const useChartTooltip = ({ chartData, timeScale, margin, dimensions }: UseChartTooltipProps) => {
  const [tooltipData, setTooltipData] = useState<ChartDataPoint | null>(null);
  const [tooltipLeft, setTooltipLeft] = useState<number>(0);
  const [tooltipTop, setTooltipTop] = useState<number>(0);
  const [tooltipOpen, setTooltipOpen] = useState<boolean>(false);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);

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

      const coordinates = localPoint(event) || { x: 0, y: 0 };
      const x = coordinates.x;
      const y = coordinates.y;
      
      const x0 = timeScale.invert(x - margin.left);
      
      // Filter out data points with no actual values (all zeros)
      const validData = chartData.filter(d => 
        d.consumption > 0 || d.production > 0 || d.grid !== 0 || 
        (d.voltage !== undefined && d.voltage > 0) || 
        (d.clearSkyProduction !== undefined && d.clearSkyProduction > 0)
      );
      
      // If no valid data, don't show tooltip
      if (validData.length === 0) return;
      
      let closestIndex = 0;
      let minDistance = Infinity;
      
      for (let i = 0; i < validData.length; i++) {
        const distance = Math.abs(new Date(validData[i].timestamp).getTime() - x0.getTime());
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = i;
        }
      }
      
      const dataPoint = validData[closestIndex];
      
      if (!dataPoint) return;
      
      // Dynamic positioning based on pointer location
      // If pointer is in the right half of the chart, position tooltip to the left
      // If pointer is in the left half, position tooltip to the right
      const isRightHalf = x > dimensions.width / 2;
      
      // For height, always try to position above the cursor, unless near the top
      const isTopHalf = y < dimensions.height / 3;
      
      // Base tooltip dimensions - height is approximated
      const tooltipHeight = 120;
      
      // Calculate position based on cursor location
      let tooltipX, tooltipY;
      
      if (isRightHalf) {
        // Position to the left of cursor
        tooltipX = Math.max(10, x - 20);
      } else {
        // Position to the right of cursor
        tooltipX = x + 20;
      }
      
      if (isTopHalf) {
        // Position below cursor if near top
        tooltipY = y + 10;
      } else {
        // Position above cursor
        tooltipY = Math.max(10, y - tooltipHeight - 10);
      }
      
      // Make sure tooltip stays within chart boundaries
      tooltipX = Math.max(10, Math.min(tooltipX, dimensions.width - 10));
      tooltipY = Math.max(10, Math.min(tooltipY, dimensions.height - tooltipHeight));
      
      setTooltipData(dataPoint);
      setTooltipLeft(tooltipX);
      setTooltipTop(tooltipY);
      setCursorPosition({ x, y: dimensions.height });
      setTooltipOpen(true);
    }, 50),
    [chartData, timeScale, margin, dimensions]
  );

  const hideTooltip = useCallback(() => {
    setTooltipOpen(false);
    setCursorPosition(null);
  }, []);

  return {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    tooltipOpen,
    cursorPosition,
    handleTooltip,
    hideTooltip
  };
};
