
import { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useDailyEnergyTotals } from '@/hooks/useDailyEnergyTotals';
import { useD3EnergyFlowVisualization, PowerData } from '@/hooks/useD3EnergyFlowVisualization';
import { getShellyConfig } from '@/lib/api';
import { ShellyConfig } from '@/lib/types';

interface D3EnergyFlowProps {
  configId?: string;
  className?: string;
}

export function D3EnergyFlow({ configId, className }: D3EnergyFlowProps) {
  const { dailyTotals, loading } = useDailyEnergyTotals(configId);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [shellyConfig, setShellyConfig] = useState<ShellyConfig | null>(null);

  // Fetch Shelly config to get power limits
  useEffect(() => {
    const fetchConfig = async () => {
      if (configId) {
        const config = await getShellyConfig(configId);
        setShellyConfig(config);
      }
    };
    
    fetchConfig();
  }, [configId]);

  // Calculate self-consumption ratio in percentage
  const selfConsumptionRatio = dailyTotals.production > 0 
    ? ((dailyTotals.production - dailyTotals.injection) / dailyTotals.production) * 100 
    : 0;

  // Convert dailyTotals to PowerData
  const powerData: PowerData = {
    production: dailyTotals.production,
    consumption: dailyTotals.consumption,
    injection: dailyTotals.injection,
    importFromGrid: dailyTotals.importFromGrid,
    selfConsumption: Math.max(0, dailyTotals.production - dailyTotals.injection),
    selfConsumptionRatio: selfConsumptionRatio, // Ajout du ratio d'autoconsommation
    batteryCharge: 0,
    batteryDischarge: 0
  };

  // Calculate max power values in watts
  const maxValues = {
    inverterPowerW: shellyConfig?.inverterPowerKva ? shellyConfig.inverterPowerKva * 1000 : 3000,
    gridSubscriptionW: shellyConfig?.gridSubscriptionKva ? shellyConfig.gridSubscriptionKva * 1000 : 6000
  };

  // Initialize D3 visualization
  useD3EnergyFlowVisualization({
    svgRef,
    powerData,
    loading,
    isClient,
    setIsClient,
    maxValues,
    mode: 'daily' // Indique que c'est la vue journalière
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
