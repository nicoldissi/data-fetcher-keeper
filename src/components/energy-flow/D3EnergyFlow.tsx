
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useDailyEnergyTotals } from '@/hooks/useDailyEnergyTotals';
import { useD3EnergyFlowVisualization } from '@/hooks/useD3EnergyFlowVisualization';

interface D3EnergyFlowProps {
  configId?: string;
  className?: string;
}

export function D3EnergyFlow({ configId, className }: D3EnergyFlowProps) {
  const { dailyTotals, loading } = useDailyEnergyTotals(configId);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isClient, setIsClient] = useState(false);

  // Initialize D3 visualization
  useD3EnergyFlowVisualization({
    svgRef,
    dailyTotals,
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
    <div className={cn("", className)}>
      <div className="flex justify-center">
        <svg ref={svgRef} width="700" height="500" className="max-w-full"></svg>
      </div>
    </div>
  );
}
