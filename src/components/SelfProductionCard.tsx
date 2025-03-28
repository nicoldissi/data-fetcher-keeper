
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShellyEMData } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { useDailyEnergyTotals } from '@/hooks/useDailyEnergyTotals';

interface SelfProductionCardProps {
  data: ShellyEMData | null;
  className?: string;
  configId?: string;
}

export function SelfProductionCard({ data, className, configId }: SelfProductionCardProps) {
  const { dailyTotals } = useDailyEnergyTotals(configId);
  
  // Ensure we have valid dailyTotals to work with
  const validTotals = dailyTotals || { 
    production: 0, 
    importFromGrid: 0, 
    injection: 0, 
    consumption: 0 
  };

  // Calculate self-production rate using daily totals
  // This represents what percentage of home consumption is covered by local PV
  const calculateSelfProductionRate = () => {
    if (!validTotals) {
      return 0;
    }
    
    // Direct consumption from PV (PV production that wasn't injected to grid)
    const pvToHome = Math.max(0, validTotals.production - validTotals.injection);
    
    // Total home consumption is the sum of grid import + direct PV consumption
    const totalHomeConsumption = validTotals.importFromGrid + pvToHome;
    
    if (totalHomeConsumption <= 0) {
      return 0;
    }
    
    // Self-production rate is the percentage of home consumption covered by PV
    const selfProductionRate = (pvToHome / totalHomeConsumption) * 100;
    
    // Ensure the rate is between 0 and 100
    return Math.max(0, Math.min(100, selfProductionRate));
  };
  
  const selfProductionRate = calculateSelfProductionRate();
  const formattedRate = selfProductionRate.toFixed(1);
  
  // Calculate energy values in kWh correctly using the same logic as in the calculation function
  const pvToHome = Math.max(0, (validTotals.production - validTotals.injection || 0)) / 1000;
  const gridImport = (validTotals.importFromGrid || 0) / 1000;
  const totalHomeConsumption = pvToHome + gridImport;
  
  console.log('SelfProductionCard values:', { 
    pvToHome, 
    gridImport, 
    totalHomeConsumption, 
    selfProductionRate,
    dailyTotals: validTotals
  });
  
  // Determine color based on self-production rate
  const getColor = (rate: number) => {
    if (rate >= 50) return '#10b981'; // Green for high self-production
    if (rate >= 25) return '#f59e0b'; // Amber for medium self-production
    return '#ef4444'; // Red for low self-production
  };
  
  const color = getColor(selfProductionRate);
  
  // Calculate positions for the labels based on the sectors
  const getSelfProducedPosition = () => {
    // Calculate the angle that corresponds to the middle of self-produced sector
    const midpointAngle = selfProductionRate / 2;
    // Convert from percentage to radians (0-100% maps to 0-2π)
    const angleRadians = (midpointAngle * 3.6 - 90) * (Math.PI / 180);
    
    // Calculate position with radius (can be adjusted based on gauge size)
    const radius = 120; // Adjusted for better positioning
    const x = Math.cos(angleRadians) * radius;
    const y = Math.sin(angleRadians) * radius;
    
    return { top: `calc(50% + ${y}px)`, left: `calc(50% + ${x}px)` };
  };
  
  const getGridConsumptionPosition = () => {
    // Calculate the angle that corresponds to the middle of grid consumption sector
    const midpointAngle = (selfProductionRate + (100 - selfProductionRate) / 2);
    // Convert from percentage to radians
    const angleRadians = (midpointAngle * 3.6 - 90) * (Math.PI / 180);
    
    // Calculate position with radius (can be adjusted based on gauge size)
    const radius = 120; // Adjusted for better positioning
    const x = Math.cos(angleRadians) * radius;
    const y = Math.sin(angleRadians) * radius;
    
    return { top: `calc(50% + ${y}px)`, left: `calc(50% + ${x}px)` };
  };
  
  const selfProducedPosition = getSelfProducedPosition();
  const gridConsumptionPosition = getGridConsumptionPosition();
  
  return (
    <Card className={cn("overflow-hidden backdrop-blur-sm bg-white/90 border-0 shadow-md h-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center">
          <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded mr-2">QUOTIDIEN</span>
          Autoproduction
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center p-6 h-[calc(100%-4rem)]">
        <div className="w-52 h-52 mb-4 relative">
          <CircularProgressbar
            value={selfProductionRate}
            styles={buildStyles({
              pathColor: '#10b981', // Green for PV
              trailColor: '#007bff', // Blue for Grid
              strokeLinecap: 'butt',
              textSize: '16px',
            })}
          />
          
          {/* Center text - Total Consumption value */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="text-2xl font-bold text-gray-800">{totalHomeConsumption.toFixed(2)}</div>
            <div className="text-xs text-gray-600">kWh Conso</div>
            <div className="text-sm font-medium mt-1 text-gray-700">{formattedRate}% autoproduit</div>
          </div>
          
          {/* Self produced consumption sector label - dynamically positioned */}
          <div
            className="absolute text-emerald-600 font-medium text-sm bg-white/90 px-2 py-1 rounded-full shadow-sm border border-emerald-200 flex flex-col items-center justify-center"
            style={{
              position: "absolute",
              ...selfProducedPosition,
              transform: "translate(-50%, -50%)",
              zIndex: 10,
              whiteSpace: "nowrap",
              minWidth: "80px",
              textAlign: "center",
            }}
          >
            <div>Origine photovoltaïque</div>
            <div>{pvToHome.toFixed(2)} kWh</div>
          </div>

          {/* Grid consumption sector label - dynamically positioned */}
          <div
            className="absolute text-blue-600 font-medium text-sm bg-white/90 px-2 py-1 rounded-full shadow-sm border border-blue-200 flex flex-col items-center justify-center"
            style={{
              position: "absolute",
              ...gridConsumptionPosition,
              transform: "translate(-50%, -50%)",
              zIndex: 10,
              whiteSpace: "nowrap",
              minWidth: "80px",
              textAlign: "center",
            }}
          >
            <div>Origine réseau</div>
            <div>{gridImport.toFixed(2)} kWh</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
