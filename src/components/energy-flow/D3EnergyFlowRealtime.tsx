
import { useRef, useState, useEffect } from 'react';
import { ShellyEMData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useD3EnergyFlowVisualization } from '@/hooks/useD3EnergyFlowVisualization';
import { useDailyEnergyTotals } from '@/hooks/useDailyEnergyTotals';
import { Button } from '@/components/ui/button';
import { Clock, Calendar } from 'lucide-react';

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
  
  // Calculate realtime totals from current data
  const realtimeTotals = currentData ? {
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

  // Use the D3 visualization hook with the appropriate data
  useD3EnergyFlowVisualization({
    svgRef,
    dailyTotals: showDaily ? dailyTotals : realtimeTotals,
    loading: showDaily ? loading : !currentData,
    isClient,
    setIsClient
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
