
import { ShellyEMData } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useDailyEnergyTotals } from '@/hooks/useDailyEnergyTotals';
import { formatLocalDate } from '@/lib/dateUtils';
import { Label } from '@/components/ui/label';

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
  const pvCurrent = data && data.voltage > 0 ? data.production_power / data.voltage : 0;
  
  const isExporting = data && data.power < 0;
  
  const currentColor = isExporting ? 'text-blue-500' : 'text-red-500';
  
  return (
    <Card className={cn("overflow-hidden backdrop-blur-sm bg-white/90 border-0 shadow-md h-full w-full", className)}>
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
          <div className="mt-4 space-y-4">
            <div className="flex items-center space-x-4">
              <Label className="text-xs text-gray-500 min-w-16">Tension:</Label>
              <span className="text-lg font-medium">{data.voltage.toFixed(1)} V</span>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Linky</h4>
                  {isExporting && (
                    <Badge variant="outline" className="px-2 py-0.5 text-xs text-blue-500 border-blue-200">
                      <span className="text-[10px] align-middle">export</span>
                    </Badge>
                  )}
                  {!isExporting && (
                    <Badge variant="outline" className="px-2 py-0.5 text-xs text-red-500 border-red-200">
                      <span className="text-[10px] align-middle">import</span>
                    </Badge>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500">Puissance:</p>
                    <p className={cn("font-medium", currentColor)}>
                      {Math.abs(data.power).toFixed(0)} W
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500">Courant:</p>
                    <p className={cn("font-medium", currentColor)}>
                      {Math.abs(gridCurrent).toFixed(2)} A
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500">PF:</p>
                    <p className="font-medium">{data.pf ? data.pf.toFixed(2) : "-"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500">Réactif:</p>
                    <p className="font-medium">{data.reactive ? data.reactive.toFixed(0) : "-"} VAR</p>
                  </div>
                </div>
              </div>
              
              <div className="border rounded-lg p-3">
                <h4 className="font-medium mb-2">PV</h4>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500">Puissance:</p>
                    <p className="font-medium text-green-600">
                      {data.production_power.toFixed(0)} W
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500">Courant:</p>
                    <p className="font-medium text-green-600">
                      {pvCurrent.toFixed(2)} A
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500">PF:</p>
                    <p className="font-medium">-</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500">Réactif:</p>
                    <p className="font-medium">-</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
