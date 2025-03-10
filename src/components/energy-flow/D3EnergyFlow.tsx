
import { useRef, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  const [hasInitialData, setHasInitialData] = useState(false);

  // Track if we've ever received data
  useEffect(() => {
    if (!loading && dailyTotals && !hasInitialData) {
      setHasInitialData(true);
    }
  }, [loading, dailyTotals, hasInitialData]);

  // Initialize D3 visualization
  useD3EnergyFlowVisualization({
    svgRef,
    dailyTotals,
    loading,
    isClient,
    setIsClient
  });

  // Show loading only on initial load, not during data refreshes
  if (loading && !hasInitialData) {
    return (
      <div className={cn("h-[500px] flex items-center justify-center", className)}>
        <p className="text-gray-500">Chargement des données journalières...</p>
      </div>
    );
  }

  return (
    <div className={cn("", className)}>
      <div className="flex justify-center relative">
        <svg ref={svgRef} width="700" height="500" className="max-w-full"></svg>
        {loading && hasInitialData && (
          <div className="absolute inset-0 bg-white/10 flex items-center justify-center pointer-events-none">
            <div className="animate-pulse opacity-30">Actualisation...</div>
          </div>
        )}
      </div>
    </div>
  );
}
