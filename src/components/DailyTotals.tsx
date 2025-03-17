
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDailyEnergyTotals } from '@/hooks/useDailyEnergyTotals';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { cn } from '@/lib/utils';
import { ShellyEMData } from '@/lib/types';

interface DailyTotalsProps {
  data: ShellyEMData | null;
  className?: string;
  configId?: string;
}

export function DailyTotals({ data, className, configId }: DailyTotalsProps) {
  const { dailyTotals } = useDailyEnergyTotals(configId);
  
  // Ensure we have valid dailyTotals to work with
  const validTotals = dailyTotals || { 
    production: 0, 
    importFromGrid: 0, 
    injection: 0, 
    consumption: 0 
  };
  
  // Calculate self-consumption rate using daily totals
  const calculateSelfConsumptionRate = () => {
    if (!validTotals || validTotals.production <= 0) {
      return 0;
    }
    
    // Self consumption = (Total production - What was sent to grid) / Total production
    const pvConsumedLocally = Math.max(0, validTotals.production - validTotals.injection);
    const selfConsumptionRate = (pvConsumedLocally / validTotals.production) * 100;
    
    // Ensure the rate is between 0 and 100
    return Math.max(0, Math.min(100, selfConsumptionRate));
  };
  
  const selfConsumptionRate = calculateSelfConsumptionRate();
  const formattedRate = selfConsumptionRate.toFixed(1);
  
  // Determine color based on self-consumption rate
  const getColor = (rate: number) => {
    if (rate >= 70) return '#10b981'; // Green for high self-consumption
    if (rate >= 45) return '#f59e0b'; // Amber for medium self-consumption
    return '#ef4444'; // Red for low self-consumption
  };
  
  const color = getColor(selfConsumptionRate);
  
  // Calculate the home consumption (grid import + direct PV consumption)
  const pvToHome = Math.max(0, validTotals.production - validTotals.injection);
  const totalHomeConsumption = validTotals.importFromGrid + pvToHome;

  console.log('DailyTotals values:', { 
    totalProduction: validTotals.production,
    pvToHome, 
    gridImport: validTotals.importFromGrid,
    gridInjection: validTotals.injection,
    totalHomeConsumption, 
    selfConsumptionRate,
    dailyTotals: validTotals
  });

  return (
    <Card className={cn("overflow-hidden backdrop-blur-sm bg-white/90 border-0 shadow-md", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center">
          <span className="bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded mr-2">QUOTIDIEN</span>
          Totaux Journaliers
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div className="sm:col-span-1">
            <h3 className="font-medium text-sm text-gray-500 mb-3">Autoconsommation</h3>
            <div className="flex flex-col items-center">
              <div className="w-24 h-24">
                <CircularProgressbar
                  value={selfConsumptionRate}
                  text={`${formattedRate}%`}
                  styles={buildStyles({
                    textSize: '16px',
                    pathColor: color,
                    textColor: color,
                    trailColor: '#e5e7eb',
                  })}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                {selfConsumptionRate >= 80 ? 'Excellente' :
                 selfConsumptionRate >= 70 ? 'Très Bonne' :
                 selfConsumptionRate >= 50 ? 'Bonne' :
                 'Faible'}
              </p>
            </div>
          </div>
          
          <div className="sm:col-span-4">
            <h3 className="font-medium text-sm text-gray-500 mb-3">Statistiques</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Production PV</p>
                <p className="text-lg font-medium">{(validTotals.production / 1000).toFixed(2)} kWh</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Soutirage Réseau</p>
                <p className="text-lg font-medium">{(validTotals.importFromGrid / 1000).toFixed(2)} kWh</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Injection Réseau</p>
                <p className="text-lg font-medium">{(validTotals.injection / 1000).toFixed(2)} kWh</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Consommation Maison</p>
                <p className="text-lg font-medium">{(totalHomeConsumption / 1000).toFixed(2)} kWh</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
