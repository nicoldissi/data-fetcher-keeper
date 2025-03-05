
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShellyEMData } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { useDailyEnergyTotals } from '@/hooks/useDailyEnergyTotals';

interface SelfConsumptionCardProps {
  data: ShellyEMData | null;
  className?: string;
}

export function SelfConsumptionCard({ data, className }: SelfConsumptionCardProps) {
  const { dailyTotals } = useDailyEnergyTotals();

  // Calculate self-consumption rate using daily totals
  const calculateSelfConsumptionRate = () => {
    if (!dailyTotals || dailyTotals.production <= 0) {
      return 0;
    }
    
    // Calculate self-consumption using daily totals
    const consumedFromProduction = dailyTotals.production - dailyTotals.injection;
    const selfConsumptionRate = (consumedFromProduction / dailyTotals.production) * 100;
    
    // Ensure the rate is between 0 and 100
    return Math.max(0, Math.min(100, selfConsumptionRate));
  };
  
  const selfConsumptionRate = calculateSelfConsumptionRate();
  const formattedRate = selfConsumptionRate.toFixed(1);
  
  // Calculate energy values in kWh
  const totalProduction = (dailyTotals?.production || 0) / 1000; // Wh to kWh
  const selfConsumed = (dailyTotals?.production - dailyTotals?.injection || 0) / 1000;
  const gridInjection = (dailyTotals?.injection || 0) / 1000;
  
  // Determine color based on self-consumption rate
  const getColor = (rate: number) => {
    if (rate >= 70) return '#10b981'; // Green for high self-consumption
    if (rate >= 45) return '#f59e0b'; // Amber for medium self-consumption
    return '#ef4444'; // Red for low self-consumption
  };
  
  const color = getColor(selfConsumptionRate);
  
  return (
    <Card className={cn("overflow-hidden backdrop-blur-sm bg-white/90 border-0 shadow-md h-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center">
          <span className="bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded mr-2">QUOTIDIEN</span>
          Taux d'Autoconsommation
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center p-6 h-[calc(100%-4rem)]">
        <div className="w-32 h-32 mb-4">
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
        
        <div className="grid grid-cols-1 gap-2 w-full max-w-xs mt-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Production PV:</span>
            <span className="font-medium">{totalProduction.toFixed(2)} kWh</span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Autoconsommée:</span>
            <span className="font-medium text-emerald-600">{selfConsumed.toFixed(2)} kWh</span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Injectée réseau:</span>
            <span className="font-medium text-blue-600">{gridInjection.toFixed(2)} kWh</span>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground text-center mt-4">
          {selfConsumptionRate >= 80 ? 'Excellente autoconsommation' :
           selfConsumptionRate >= 70 ? 'Très Bonne autoconsommation' :
           selfConsumptionRate >= 50 ? 'Bonne autoconsommation' :
           'Faible autoconsommation'}
        </p>
      </CardContent>
    </Card>
  );
}
