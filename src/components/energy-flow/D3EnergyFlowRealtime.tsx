
import { useRef, useState, useEffect } from 'react';
import { ShellyEMData, ShellyConfig } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useD3EnergyFlowVisualization, PowerData } from '@/hooks/useD3EnergyFlowVisualization';
import { useDailyEnergyTotals } from '@/hooks/useDailyEnergyTotals';
import { Button } from '@/components/ui/button';
import { Clock, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getShellyConfig } from '@/lib/api';

interface D3EnergyFlowRealtimeProps {
  data: ShellyEMData | null;
  configId?: string;
  className?: string;
  onToggleView?: () => void;
  showDaily?: boolean;
}

export function D3EnergyFlowRealtime({ 
  data: currentData, 
  configId, 
  className, 
  onToggleView,
  showDaily = false
}: D3EnergyFlowRealtimeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isClient, setIsClient] = useState(false);
  const { dailyTotals, loading } = useDailyEnergyTotals(configId || null);
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

  // Subscribe to real-time updates from Supabase
  useEffect(() => {
    if (!configId) return;

    const channel = supabase.channel('realtime-energy')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'energy_data',
        filter: `shelly_config_id=eq.${configId}`
      }, (payload) => {
        console.log('New energy data:', payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [configId]);
  
  // Calculate realtime totals from current data
  const realtimeTotals: PowerData = currentData ? {
    production: currentData.pv_power,
    consumption: currentData.power + currentData.pv_power,
    importFromGrid: currentData.power > 0 ? currentData.power : 0,
    injection: currentData.power < 0 ? Math.abs(currentData.power) : 0,
    batteryCharge: 0,
    batteryDischarge: 0,
    selfConsumption: Math.min(currentData.pv_power, currentData.power + currentData.pv_power)
  } : {
    production: 0,
    consumption: 0,
    importFromGrid: 0,
    injection: 0,
    batteryCharge: 0,
    batteryDischarge: 0,
    selfConsumption: 0
  };

  // Convert dailyTotals to PowerData
  const dailyPowerData: PowerData = {
    production: dailyTotals.production,
    consumption: dailyTotals.consumption,
    injection: dailyTotals.injection,
    importFromGrid: dailyTotals.importFromGrid,
    selfConsumption: Math.max(0, dailyTotals.production - dailyTotals.injection),
    batteryCharge: 0,
    batteryDischarge: 0
  };

  // Calculate max power values in watts
  const maxValues = {
    inverterPowerW: shellyConfig?.inverterPowerKva ? shellyConfig.inverterPowerKva * 1000 : 3000,
    gridSubscriptionW: shellyConfig?.gridSubscriptionKva ? shellyConfig.gridSubscriptionKva * 1000 : 6000
  };

  // Use the D3 visualization hook with the appropriate data
  useD3EnergyFlowVisualization({
    svgRef,
    powerData: showDaily ? dailyPowerData : realtimeTotals,
    loading: showDaily ? loading : !currentData,
    isClient,
    setIsClient,
    maxValues
  });

  if (!currentData && !showDaily) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Flux d'énergie en temps réel</CardTitle>
          <div className="flex space-x-2">
            <Button 
              variant={!showDaily ? "default" : "outline"}
              size="sm"
              onClick={() => onToggleView && onToggleView()}
              className="flex items-center gap-1"
            >
              <Clock className="h-4 w-4" />
              Temps réel
            </Button>
            <Button 
              variant={showDaily ? "default" : "outline"}
              size="sm"
              onClick={() => onToggleView && onToggleView()}
              className="flex items-center gap-1"
            >
              <Calendar className="h-4 w-4" />
              Journalier
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center text-muted-foreground">
            <p>Données non disponibles</p>
            <p className="text-sm">Vérifiez la connexion avec votre appareil Shelly</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>
          {showDaily ? "Bilan Énergétique Journalier" : "Flux d'énergie en temps réel"}
        </CardTitle>
        <div className="flex space-x-2">
          <Button 
            variant={!showDaily ? "default" : "outline"}
            size="sm"
            onClick={() => onToggleView && onToggleView()}
            className="flex items-center gap-1"
          >
            <Clock className="h-4 w-4" />
            Temps réel
          </Button>
          <Button 
            variant={showDaily ? "default" : "outline"}
            size="sm"
            onClick={() => onToggleView && onToggleView()}
            className="flex items-center gap-1"
          >
            <Calendar className="h-4 w-4" />
            Journalier
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex justify-center">
        <svg ref={svgRef} width="700" height="500" />
      </CardContent>
    </Card>
  );
}
