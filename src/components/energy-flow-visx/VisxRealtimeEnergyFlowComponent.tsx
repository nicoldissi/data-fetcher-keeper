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

  if (!data) {
    return (
      <div className="h-[500px] flex items-center justify-center">
        <p className="text-gray-500">En attente de données en temps réel...</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <VisxRealtimeEnergyFlow 
        data={data} 
        configId={configId} 
        config={config} 
      />
    </div>
  );
}