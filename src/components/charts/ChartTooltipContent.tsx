
import { ChartDataPoint } from '@/hooks/energy-chart/types';

interface ChartTooltipContentProps {
  tooltipData: ChartDataPoint;
  showConsumption: boolean;
  showProduction: boolean;
  showGrid: boolean;
  showVoltage: boolean;
  showClearSky: boolean;
}

export const ChartTooltipContent = ({
  tooltipData,
  showConsumption,
  showProduction,
  showGrid,
  showVoltage,
  showClearSky
}: ChartTooltipContentProps) => {
  if (!tooltipData) return null;
  
  return (
    <>
      <div className="font-semibold mb-1 text-gray-900 dark:text-gray-100">{tooltipData.time}</div>
      <div className="space-y-1">
        {showConsumption && tooltipData.consumption > 0 && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-[#F97415]"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Consommation:</span>
            </div>
            <span className="font-medium text-gray-900 dark:text-gray-100">{tooltipData.consumption} W</span>
          </div>
        )}
        {showProduction && tooltipData.production > 0 && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-[#00FF59]"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Production:</span>
            </div>
            <span className="font-medium text-gray-900 dark:text-gray-100">{tooltipData.production} W</span>
          </div>
        )}
        {showGrid && tooltipData.grid !== 0 && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-[#42A5F5]"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Réseau:</span>
            </div>
            <span className="font-medium text-gray-900 dark:text-gray-100">{tooltipData.grid} W</span>
          </div>
        )}
        {showVoltage && tooltipData.voltage && tooltipData.voltage > 0 && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-[#9b87f5]"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Tension:</span>
            </div>
            <span className="font-medium text-gray-900 dark:text-gray-100">{tooltipData.voltage} V</span>
          </div>
        )}
        {showClearSky && tooltipData.clearSkyProduction !== undefined && tooltipData.clearSkyProduction > 0 && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-[#D4E157]"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Production idéale:</span>
            </div>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {Math.round(tooltipData.clearSkyProduction)} W
            </span>
          </div>
        )}
      </div>
    </>
  );
};
