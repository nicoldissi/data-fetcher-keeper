
import { ShellyEMData } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DeviceStatusProps {
  data: ShellyEMData | null;
  lastUpdated: string;
  className?: string;
}

export function DeviceStatus({ data, lastUpdated, className }: DeviceStatusProps) {
  const isOnline = data?.is_valid ?? false;
  
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
            Updated: {lastUpdated}
          </Badge>
        </div>
        
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Temperature</p>
              <p className="text-lg font-medium">{data.temperature.toFixed(1)}°C</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Voltage</p>
              <p className="text-lg font-medium">{data.voltage.toFixed(1)} V</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Current</p>
              <p className="text-lg font-medium">{data.current.toFixed(2)} A</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
