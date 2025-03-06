
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
        <div className="w-52 h-52 mb-4 relative">
          <CircularProgressbar
            value={selfConsumptionRate}
            styles={buildStyles({
              pathColor: color,
              trailColor: '#e5e7eb',
              strokeLinecap: 'butt',
              textSize: '16px',
            })}
          />
          
          {/* Center text - Production PV value */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="text-2xl font-bold text-gray-800">{totalProduction.toFixed(2)}</div>
            <div className="text-xs text-gray-600">kWh PV</div>
            <div className="text-sm font-medium mt-1 text-gray-700">{formattedRate}% autoconsommé</div>
          </div>
          
          {/* Self consumed sector label - positioned at top right */}
          <div 
            className="absolute text-emerald-600 font-medium text-sm bg-white/80 px-1 rounded"
            style={{ 
              top: '20%', 
              right: '-15%',
              transform: 'translateY(-50%)'
            }}
          >
            {selfConsumed.toFixed(2)} kWh
          </div>
          
          {/* Grid injection sector label - positioned at bottom right */}
          <div 
            className="absolute text-blue-600 font-medium text-sm bg-white/80 px-1 rounded"
            style={{ 
              bottom: '20%', 
              right: '-15%',
              transform: 'translateY(50%)'
            }}
          >
            {gridInjection.toFixed(2)} kWh
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
