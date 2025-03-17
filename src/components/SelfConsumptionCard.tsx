
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShellyEMData } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { useDailyEnergyTotals } from '@/hooks/useDailyEnergyTotals';

interface SelfConsumptionCardProps {
  data: ShellyEMData | null;
  className?: string;
  configId?: string;
}

export function SelfConsumptionCard({ data, className, configId }: SelfConsumptionCardProps) {
  const { dailyTotals } = useDailyEnergyTotals(configId);
  
  // Ensure we have valid dailyTotals to work with
  const validTotals = dailyTotals || { 
    production: 0, 
    importFromGrid: 0, 
    injection: 0, 
    consumption: 0 
  };

  // Calculate self-consumption rate using daily totals
  // This represents what percentage of PV production is used directly by the home
  const calculateSelfConsumptionRate = () => {
    if (!validTotals.production || validTotals.production <= 0) {
      return 0;
    }
    
    // Calculate self-consumption using daily totals
    // Self consumption = (Total production - What was sent to grid) / Total production
    const consumedFromProduction = Math.max(0, validTotals.production - validTotals.injection);
    const selfConsumptionRate = (consumedFromProduction / validTotals.production) * 100;
    
    // Ensure the rate is between 0 and 100
    return Math.max(0, Math.min(100, selfConsumptionRate));
  };
  
  const selfConsumptionRate = calculateSelfConsumptionRate();
  const formattedRate = selfConsumptionRate.toFixed(1);
  
  // Calculate energy values in kWh
  const totalProduction = (validTotals.production || 0) / 1000; // Wh to kWh
  const selfConsumed = Math.max(0, (validTotals.production - validTotals.injection || 0)) / 1000;
  const gridInjection = (validTotals.injection || 0) / 1000;
  
  // Determine color based on self-consumption rate
  const getColor = (rate: number) => {
    if (rate >= 70) return '#10b981'; // Green for high self-consumption
    if (rate >= 45) return '#f59e0b'; // Amber for medium self-consumption
    return '#ef4444'; // Red for low self-consumption
  };
  
  const color = getColor(selfConsumptionRate);
  
  // Calculate positions for the labels based on the sectors
  const getSelfConsumedPosition = () => {
    // Calculate the angle that corresponds to the middle of self-consumed sector
    const midpointAngle = selfConsumptionRate / 2;
    // Convert from percentage to radians (0-100% maps to 0-2π)
    const angleRadians = (midpointAngle * 3.6 - 90) * (Math.PI / 180);
    
    // Calculate position with radius (can be adjusted based on gauge size)
    const radius = 120; // Adjusted for better positioning
    const x = Math.cos(angleRadians) * radius;
    const y = Math.sin(angleRadians) * radius;
    
    return { top: `calc(50% + ${y}px)`, left: `calc(50% + ${x}px)` };
  };
  
  const getInjectionPosition = () => {
    // Calculate the angle that corresponds to the middle of injection sector
    const midpointAngle = (selfConsumptionRate + (100 - selfConsumptionRate) / 2);
    // Convert from percentage to radians
    const angleRadians = (midpointAngle * 3.6 - 90) * (Math.PI / 180);
    
    // Calculate position with radius (can be adjusted based on gauge size)
    const radius = 120; // Adjusted for better positioning
    const x = Math.cos(angleRadians) * radius;
    const y = Math.sin(angleRadians) * radius;
    
    return { top: `calc(50% + ${y}px)`, left: `calc(50% + ${x}px)` };
  };
  
  const selfConsumedPosition = getSelfConsumedPosition();
  const injectionPosition = getInjectionPosition();
  
  console.log('SelfConsumptionCard values:', { 
    totalProduction, 
    selfConsumed, 
    gridInjection, 
    selfConsumptionRate,
    dailyTotals: validTotals
  });
  
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
              pathColor: '#10b981', // Green for self-consumed
              trailColor: '#007bff', // Blue for grid injection
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
          
          {/* Self consumed sector label - dynamically positioned */}
          <div
            className="absolute text-emerald-600 font-medium text-sm bg-white/90 px-2 py-1 rounded-full shadow-sm border border-emerald-200 flex flex-col items-center justify-center"
            style={{
              position: 'absolute',
              ...selfConsumedPosition,
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
              whiteSpace: 'nowrap',
              minWidth: '80px',
              textAlign: 'center'
            }}
          >
            <div>Autoconsommé</div>
            <div>{selfConsumed.toFixed(2)} kWh</div>
          </div>

          {/* Grid injection sector label - dynamically positioned */}
          <div
            className="absolute text-blue-600 font-medium text-sm bg-white/90 px-2 py-1 rounded-full shadow-sm border border-blue-200 flex flex-col items-center justify-center"
            style={{
              position: "absolute",
              ...injectionPosition,
              transform: "translate(-50%, -50%)",
              zIndex: 10,
              whiteSpace: "nowrap",
              minWidth: "80px",
              textAlign: "center",
            }}
          >
            <div>Injection</div>
            <div>{gridInjection.toFixed(2)} kWh</div>
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
