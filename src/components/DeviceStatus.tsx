
import { ShellyEMData } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useDailyEnergyTotals } from '@/hooks/useDailyEnergyTotals';
import { formatLocalDate } from '@/lib/dateUtils';

interface DeviceStatusProps {
  data: ShellyEMData | null;
  lastUpdated: string;
  className?: string;
  configId?: string;
}

export function DeviceStatus({ data, lastUpdated, className, configId }: DeviceStatusProps) {
  const isOnline = data?.is_valid ?? false;
  const { dailyTotals, loading } = useDailyEnergyTotals(configId);
  
  const formattedTimestamp = data 
    ? formatLocalDate(data.timestamp)
    : 'Jamais';
  
  const gridCurrent = data && data.voltage > 0 ? data.power / data.voltage : 0;
  
  const isExporting = data && data.power < 0;
  
  const currentColor = isExporting ? 'text-blue-500' : 'text-red-500';
  
  return (
    <Card className={cn("overflow-hidden backdrop-blur-sm bg-white/90 border-0 shadow-md", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-medium text-sm text-gray-500">Device Status</h3>
            <div className="flex items-center space-x-2">
              <div className={cn(
                "h-2.5 w-2.5 rounded-full",
                isOnline ? "bg-green-500 animate-pulse-subtle" : "bg-red-500"
              )} />
              <p className="text-lg font-medium">
                {isOnline ? "Online" : "Offline"}
              </p>
            </div>
          </div>
          
          <Badge variant="outline" className="px-3 py-1 text-xs">
            Mis à jour: {formattedTimestamp}
          </Badge>
        </div>
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Voltage</p>
              <p className="text-lg font-medium">{data.voltage.toFixed(1)} V</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Current Grid</p>
              <p className={cn("text-lg font-medium", currentColor)}>
                {Math.abs(gridCurrent).toFixed(2)} A
                {isExporting ? ' (export)' : ' (import)'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Current PV</p>
              <p className="text-lg font-medium">{(data.production_power / data.voltage).toFixed(2)} A</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
