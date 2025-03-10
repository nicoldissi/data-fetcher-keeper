
import { useRef, useState, useEffect } from 'react';
import { ShellyEMData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useD3EnergyFlowVisualization } from '@/hooks/useD3EnergyFlowVisualization';
import { useDailyEnergyTotals } from '@/hooks/useDailyEnergyTotals';
import { Button } from '@/components/ui/button';
import { Clock, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface D3EnergyFlowRealtimeProps {
  data: ShellyEMData | null;
  configId?: string;
  className?: string;
  onToggleView?: () => void;
  showDaily?: boolean;
}

export function D3EnergyFlowRealtime({ 
  data: initialData, 
  configId, 
  className, 
  onToggleView,
  showDaily = false
}: D3EnergyFlowRealtimeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isClient, setIsClient] = useState(false);
  const { dailyTotals, loading: dailyLoading } = useDailyEnergyTotals(configId || null);
  const [realtimeData, setRealtimeData] = useState<ShellyEMData | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  
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
        // Convert the new data to ShellyEMData format
        const newData: ShellyEMData = {
          timestamp: new Date(payload.new.timestamp).getTime(),
          power: payload.new.consumption || 0,
          reactive: payload.new.grid_reactive || 0,
          pf: payload.new.grid_pf || 0,
          pv_power: payload.new.production || 0,
          pv_reactive: payload.new.pv_reactive || 0,
          pv_pf: payload.new.pv_pf || 0,
          total_energy: payload.new.grid_total || 0,
          pv_energy: payload.new.production_total || 0,
          grid_returned: payload.new.grid_total_returned || 0,
          voltage: payload.new.voltage || 0,
          current: 0,
          temperature: 0,
          is_valid: true,
          channel: 0,
          shelly_config_id: configId,
          frequency: payload.new.frequency || 0
        };
        setRealtimeData(newData);
        setLoading(false);
      })
      .subscribe();

    // Fetch latest data on initial load
    const fetchLatestData = async () => {
      if (!initialData) {
        try {
          const { data, error } = await supabase
            .from('energy_data')
            .select('*')
            .eq('shelly_config_id', configId)
            .order('timestamp', { ascending: false })
            .limit(1);

          if (error) throw error;
          
          if (data && data.length > 0) {
            const latestData: ShellyEMData = {
              timestamp: new Date(data[0].timestamp).getTime(),
              power: data[0].consumption || 0,
              reactive: data[0].grid_reactive || 0,
              pf: data[0].grid_pf || 0,
              pv_power: data[0].production || 0,
              pv_reactive: data[0].pv_reactive || 0,
              pv_pf: data[0].pv_pf || 0,
              total_energy: data[0].grid_total || 0,
              pv_energy: data[0].production_total || 0,
              grid_returned: data[0].grid_total_returned || 0,
              voltage: data[0].voltage || 0,
              current: 0,
              temperature: 0,
              is_valid: true,
              channel: 0,
              shelly_config_id: configId,
              frequency: data[0].frequency || 0
            };
            setRealtimeData(latestData);
            setLoading(false);
          }
        } catch (error) {
          console.error('Error fetching latest data:', error);
        }
      }
    };

    fetchLatestData();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [configId, initialData]);
  
  // Calculate realtime totals from current data
  const realtimeTotals = realtimeData ? {
    production: realtimeData.pv_power,
    consumption: realtimeData.power + realtimeData.pv_power,
    importFromGrid: realtimeData.power > 0 ? realtimeData.power : 0,
    injection: realtimeData.power < 0 ? Math.abs(realtimeData.power) : 0,
    batteryCharge: 0,
    batteryDischarge: 0,
    selfConsumption: Math.min(realtimeData.pv_power, realtimeData.power + realtimeData.pv_power),
    // Add inverter and grid subscription values from realtimeData if available
    inverterPowerW: realtimeData.inverterPowerKva ? realtimeData.inverterPowerKva * 1000 : 3000,
    gridSubscriptionW: realtimeData.gridSubscriptionKva ? realtimeData.gridSubscriptionKva * 1000 : 6000
  } : {
    production: 0,
    consumption: 0,
    importFromGrid: 0,
    injection: 0,
    batteryCharge: 0,
    batteryDischarge: 0,
    selfConsumption: 0,
    inverterPowerW: 3000,
    gridSubscriptionW: 6000
  };

  // Use the D3 visualization hook with the appropriate data
  useD3EnergyFlowVisualization({
    svgRef,
    dataSource: showDaily ? { type: 'daily', data: dailyTotals } : { type: 'realtime', data: realtimeTotals },
    loading: showDaily ? dailyLoading : loading,
    isClient,
    setIsClient,
    showWatts: !showDaily
  });

  if ((!realtimeData && !showDaily) || (showDaily && dailyLoading)) {
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
