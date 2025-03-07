
import { ShellyEMData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DataTableProps {
  data: ShellyEMData[];
  className?: string;
  configId?: string | null;
}

export function DataTable({ data, className, configId }: DataTableProps) {
  // Filter data by configId if provided
  const filteredData = configId 
    ? data.filter(item => item.shelly_config_id === configId)
    : data;
    
  const reversedData = [...filteredData].reverse().slice(0, 5);
  
  return (
    <Card className={cn("overflow-hidden backdrop-blur-sm bg-white/90 border-0 shadow-md", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Recent Readings</CardTitle>
      </CardHeader>
      <CardContent>
        {reversedData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Time</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">Réseau</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">Photovoltaïque</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">Voltage</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">Intensité réseau</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">Intensité PV</th>
                </tr>
              </thead>
              <tbody>
                {reversedData.map((item, index) => {
                  // Garantir que nous avons un objet Date valide
                  const timeMs = typeof item.timestamp === 'number' ? item.timestamp : parseInt(item.timestamp as any);
                  const localDate = new Date(timeMs);
                  
                  // Formater l'heure en utilisant directement toLocaleTimeString avec les options de formatage
                  const formattedTime = localDate.toLocaleTimeString('fr-FR', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false // Format 24h pour la France
                  });
                  
                  // Calculer le temps écoulé
                  const timeAgo = formatDistance(localDate, new Date(), { 
                    addSuffix: true,
                    locale: fr 
                  });
                  
                  // Calculate grid current using the same method as DeviceStatus
                  const gridCurrent = item.voltage > 0 ? Math.abs(item.power) / item.voltage : 0;
                  
                  // Calculate photovoltaic current (approximation based on power and voltage)
                  const pvCurrent = item.voltage > 0 ? item.production_power / item.voltage : 0;
                  
                  return (
                    <tr 
                      key={item.timestamp} 
                      className={cn(
                        "border-b border-gray-100 transition-colors",
                        index === 0 ? "bg-blue-50/50" : "hover:bg-gray-50"
                      )}
                    >
                      <td className="px-4 py-3 text-left">
                        <div className="font-medium">
                          {formattedTime}
                        </div>
                        <div className="text-xs text-gray-500">{timeAgo}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {item.power.toFixed(1)} W
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {item.production_power.toFixed(1)} W
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.voltage.toFixed(1)} V
                      </td>
                      <td className="px-4 py-3 text-right">
                        {gridCurrent.toFixed(2)} A
                      </td>
                      <td className="px-4 py-3 text-right">
                        {pvCurrent.toFixed(2)} A
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No data available yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
