
import { useState, useCallback } from 'react';
import { localPoint } from '@visx/event';
import { ChartDataPoint } from './types';
import { ScaleTime } from 'd3-scale';

interface UseChartTooltipProps {
  chartData: ChartDataPoint[];
  timeScale: ScaleTime<number, number>;
  margin: { left: number };
  dimensions: { height: number };
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
      
      let closestIndex = 0;
      let minDistance = Infinity;
      
      for (let i = 0; i < chartData.length; i++) {
        const distance = Math.abs(new Date(chartData[i].timestamp).getTime() - x0.getTime());
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = i;
        }
      }
      
      const dataPoint = chartData[closestIndex];
      
      if (!dataPoint) return;
      
      // Adjust tooltip position to stay within the chart area
      // Place tooltip above the point with a small offset
      const tooltipY = Math.max(10, Math.min(y - 10, dimensions.height - 120));
      const tooltipX = Math.max(10, Math.min(x, dimensions.width - 200));
      
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
