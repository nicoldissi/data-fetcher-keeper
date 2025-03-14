
import { useRef, useState, useEffect } from 'react';
import { ShellyEMData, ShellyConfig } from '@/lib/types';
import { getShellyConfig } from '@/lib/api';
import { VisxRealtimeEnergyFlow } from './VisxRealtimeEnergyFlow';

interface VisxRealtimeEnergyFlowComponentProps {
  data: ShellyEMData | null;
  className?: string;
  configId?: string;
}

export function VisxRealtimeEnergyFlowComponent({ data, className, configId }: VisxRealtimeEnergyFlowComponentProps) {
  const [config, setConfig] = useState<ShellyConfig | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  // Fetch Shelly config when configId changes
  useEffect(() => {
    const fetchConfig = async () => {
      if (!configId) return;
      
      try {
        const fetchedConfig = await getShellyConfig(configId);
        setConfig(fetchedConfig);
      } catch (error) {
        console.error("Error fetching config:", error);
      }
    };

    fetchConfig();
  }, [configId]);

  // Set dimensions based on container size
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  if (!data) {
    return (
      <div className="h-[500px] flex items-center justify-center">
        <p className="text-gray-500">En attente de données en temps réel...</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className}>
      <VisxRealtimeEnergyFlow 
        data={data} 
        config={config} 
        width={dimensions.width}
        height={dimensions.height}
      />
    </div>
  );
}
