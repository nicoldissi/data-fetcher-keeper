
import { useRef, useState, useEffect } from 'react';
import { ShellyEMData, ShellyConfig } from '@/lib/types';
import { useD3RealtimeEnergyFlowVisualization } from '@/hooks/useD3RealtimeEnergyFlowVisualization';
import { getShellyConfig } from '@/lib/api/config';

interface D3RealtimeEnergyFlowComponentProps {
  data: ShellyEMData | null;
  className?: string;
  configId?: string;
}

export function D3RealtimeEnergyFlowComponent({ data, className, configId }: D3RealtimeEnergyFlowComponentProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [config, setConfig] = useState<ShellyConfig | null>(null);

  // Fetch Shelly config when configId changes
  useEffect(() => {
    if (configId) {
      getShellyConfig(configId).then(config => {
        console.log("Fetched config:", config);
        setConfig(config);
      });
    }
  }, [configId]);

  // Initialize D3 visualization
  useD3RealtimeEnergyFlowVisualization({
    svgRef,
    data,
    isClient,
    setIsClient,
    config
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
        <svg ref={svgRef} width="700" height="500" className="max-w-full h-auto"></svg>
      </div>
    </div>
  );
}
