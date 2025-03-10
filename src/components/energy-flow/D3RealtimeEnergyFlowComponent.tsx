
import { useRef, useState, useEffect } from 'react';
import { ShellyEMData } from '@/lib/types';
import { useD3RealtimeEnergyFlowVisualization } from '@/hooks/useD3RealtimeEnergyFlowVisualization';

interface D3RealtimeEnergyFlowComponentProps {
  data: ShellyEMData | null;
  className?: string;
}

export function D3RealtimeEnergyFlowComponent({ data, className }: D3RealtimeEnergyFlowComponentProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isClient, setIsClient] = useState(false);

  // Initialize D3 visualization
  useD3RealtimeEnergyFlowVisualization({
    svgRef,
    data,
    isClient,
    setIsClient
  });

  if (!data) {
    return (
      <div className="h-[500px] flex items-center justify-center">
        <p className="text-gray-500">En attente de données en temps réel...</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex justify-center relative">
        <svg ref={svgRef} width="700" height="500" className="max-w-full"></svg>
      </div>
    </div>
  );
}
