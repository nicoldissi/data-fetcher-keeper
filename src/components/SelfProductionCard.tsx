
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
  
  // Calculate positions for the labels based on the sectors
  const getSelfProducedPosition = () => {
    // The midpoint of the self-produced sector (from 0 to selfProductionRate%)
    const angleDegrees = (selfProductionRate / 2) * 3.6; // Convert percentage to degrees (100% = 360 degrees)
    const angleRadians = (angleDegrees - 90) * (Math.PI / 180); // Convert to radians and adjust for CircularProgressbar starting at top
    
    // Calculate position with a radius slightly outside the gauge
    const radius = 125; // The gauge radius plus some offset
    const x = Math.cos(angleRadians) * radius;
    const y = Math.sin(angleRadians) * radius;
    
    return { top: `calc(50% + ${y}px)`, left: `calc(50% + ${x}px)`, transform: 'translate(-50%, -50%)' };
  };
  
  const getGridConsumptionPosition = () => {
    // The midpoint of the grid consumption sector (from selfProductionRate% to 100%)
    const midpointPercentage = (selfProductionRate + 100) / 2;
    const angleDegrees = midpointPercentage * 3.6; // Convert percentage to degrees
    const angleRadians = (angleDegrees - 90) * (Math.PI / 180); // Convert to radians and adjust
    
    // Calculate position with a radius slightly outside the gauge
    const radius = 125; // The gauge radius plus some offset
    const x = Math.cos(angleRadians) * radius;
    const y = Math.sin(angleRadians) * radius;
    
    return { top: `calc(50% + ${y}px)`, left: `calc(50% + ${x}px)`, transform: 'translate(-50%, -50%)' };
  };
  
  const selfProducedPosition = getSelfProducedPosition();
  const gridConsumptionPosition = getGridConsumptionPosition();
  
  return (
    <Card className={cn("overflow-hidden backdrop-blur-sm bg-white/90 border-0 shadow-md h-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center">
          <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded mr-2">QUOTIDIEN</span>
          Taux d'Autoproduction
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center p-6 h-[calc(100%-4rem)]">
        <div className="w-52 h-52 mb-4 relative">
          <CircularProgressbar
            value={selfProductionRate}
            styles={buildStyles({
              pathColor: color,
              trailColor: '#e5e7eb',
              strokeLinecap: 'butt',
              textSize: '16px',
            })}
          />
          
          {/* Center text - Total Consumption value */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="text-2xl font-bold text-gray-800">{totalConsumption.toFixed(2)}</div>
            <div className="text-xs text-gray-600">kWh Conso</div>
            <div className="text-sm font-medium mt-1 text-gray-700">{formattedRate}% autoproduit</div>
          </div>
          
          {/* Self produced consumption sector label - dynamically positioned */}
          <div 
            className="absolute text-emerald-600 font-medium text-sm bg-white/80 px-2 py-1 rounded-full shadow-sm"
            style={{ 
              position: 'absolute',
              ...selfProducedPosition,
              zIndex: 10
            }}
          >
            {selfProducedConsumption.toFixed(2)} kWh
          </div>
          
          {/* Grid consumption sector label - dynamically positioned */}
          <div 
            className="absolute text-orange-600 font-medium text-sm bg-white/80 px-2 py-1 rounded-full shadow-sm"
            style={{ 
              position: 'absolute',
              ...gridConsumptionPosition,
              zIndex: 10
            }}
          >
            {gridConsumption.toFixed(2)} kWh
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
