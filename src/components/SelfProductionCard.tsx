
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShellyEMData } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { useDailyEnergyTotals } from '@/hooks/useDailyEnergyTotals';

interface SelfProductionCardProps {
  data: ShellyEMData | null;
  className?: string;
}

export function SelfProductionCard({ data, className }: SelfProductionCardProps) {
  const { dailyTotals } = useDailyEnergyTotals();

  // Calculate self-production rate using daily totals
  const calculateSelfProductionRate = () => {
    if (!dailyTotals) {
      return 0;
    }
    
    // Total house consumption is (grid consumption + production - injection)
    const totalConsumption = dailyTotals.consumption + dailyTotals.production - dailyTotals.injection;
    
    if (totalConsumption <= 0) {
      return 0;
    }
    
    // Self-produced consumption is (production - injection)
    const selfProducedConsumption = dailyTotals.production - dailyTotals.injection;
    
    // Self-production rate is percentage of total consumption covered by self-produced energy
    const selfProductionRate = (selfProducedConsumption / totalConsumption) * 100;
    
    // Ensure the rate is between 0 and 100
    return Math.max(0, Math.min(100, selfProductionRate));
  };
  
  const selfProductionRate = calculateSelfProductionRate();
  const formattedRate = selfProductionRate.toFixed(1);
  
  // Calculate energy values in kWh
  const totalConsumption = (dailyTotals?.consumption + dailyTotals?.production - dailyTotals?.injection || 0) / 1000;
  const gridConsumption = (dailyTotals?.consumption || 0) / 1000;
  const selfProducedConsumption = (dailyTotals?.production - dailyTotals?.injection || 0) / 1000;
  
  // Determine color based on self-production rate
  const getColor = (rate: number) => {
    if (rate >= 50) return '#10b981'; // Green for high self-production
    if (rate >= 25) return '#f59e0b'; // Amber for medium self-production
    return '#ef4444'; // Red for low self-production
  };
  
  const color = getColor(selfProductionRate);
  
  return (
    <Card className={cn("overflow-hidden backdrop-blur-sm bg-white/90 border-0 shadow-md h-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center">
          <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded mr-2">QUOTIDIEN</span>
          Taux d'Autoproduction
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center p-6 h-[calc(100%-4rem)]">
        <div className="w-32 h-32 mb-4">
          <CircularProgressbar
            value={selfProductionRate}
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
            <span className="text-gray-600">Consommation totale:</span>
            <span className="font-medium">{totalConsumption.toFixed(2)} kWh</span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Depuis le réseau:</span>
            <span className="font-medium text-orange-600">{gridConsumption.toFixed(2)} kWh</span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Depuis le PV:</span>
            <span className="font-medium text-emerald-600">{selfProducedConsumption.toFixed(2)} kWh</span>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground text-center mt-4">
          {selfProductionRate >= 70 ? 'Excellente autoproduction' :
           selfProductionRate >= 50 ? 'Très Bonne autoproduction' :
           selfProductionRate >= 30 ? 'Bonne autoproduction' :
           'Faible autoproduction'}
        </p>
      </CardContent>
    </Card>
  );
}
