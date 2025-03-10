
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useDailyEnergyTotals } from '@/hooks/useDailyEnergyTotals';
import { useD3EnergyFlowVisualization, PowerData } from '@/hooks/useD3EnergyFlowVisualization';

interface D3EnergyFlowProps {
  configId?: string;
  className?: string;
}

export function D3EnergyFlow({ configId, className }: D3EnergyFlowProps) {
  const { dailyTotals, loading } = useDailyEnergyTotals(configId);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isClient, setIsClient] = useState(false);

  // Convert dailyTotals to PowerData
  const powerData: PowerData = {
    production: dailyTotals.production,
    consumption: dailyTotals.consumption,
    injection: dailyTotals.injection,
    importFromGrid: dailyTotals.importFromGrid,
    selfConsumption: Math.max(0, dailyTotals.production - dailyTotals.injection),
    batteryCharge: 0,
    batteryDischarge: 0
  };

  // Initialize D3 visualization
  useD3EnergyFlowVisualization({
    svgRef,
    powerData,
    loading,
    isClient,
    setIsClient
  });

  if (loading) {
    return (
      <div className={cn("h-[500px] flex items-center justify-center", className)}>
        <p className="text-gray-500">Chargement des données journalières...</p>
      </div>
    );
  }

  return (
    <div className={cn("w-full flex justify-center", className)}>
      <svg ref={svgRef} width="700" height="500" className="max-w-full"></svg>
    </div>
  );
}
