
import { ReactNode } from 'react';
import { Plug, Sun, CircuitBoard, Zap } from 'lucide-react';
import { ChartSeriesToggle } from './ChartSeriesToggle';

interface ChartControlsProps {
  showConsumption: boolean;
  showProduction: boolean;
  showGrid: boolean;
  showVoltage: boolean;
  showClearSky: boolean;
  setShowConsumption: (value: boolean) => void;
  setShowProduction: (value: boolean) => void;
  setShowGrid: (value: boolean) => void;
  setShowVoltage: (value: boolean) => void;
  setShowClearSky: (value: boolean) => void;
}

export const ChartControls = ({
  showConsumption,
  showProduction,
  showGrid,
  showVoltage,
  showClearSky,
  setShowConsumption,
  setShowProduction,
  setShowGrid,
  setShowVoltage,
  setShowClearSky,
}: ChartControlsProps) => {
  return (
    <>
      <ChartSeriesToggle 
        label="Consommation"
        value={showConsumption}
        onChange={setShowConsumption}
        color="#F97415"
        icon={<Plug className="w-3 h-3 text-[#F97415] mr-2" />}
      />
      <ChartSeriesToggle 
        label="Production"
        value={showProduction}
        onChange={setShowProduction}
        color="#00FF59"
        icon={<Sun className="w-3 h-3 text-[#00FF59] mr-2" />}
      />
      <ChartSeriesToggle 
        label="Réseau"
        value={showGrid}
        onChange={setShowGrid}
        color="blue-500"
        icon={<CircuitBoard className="w-3 h-3 text-blue-500 mr-2" />}
      />
      <ChartSeriesToggle 
        label="Tension"
        value={showVoltage}
        onChange={setShowVoltage}
        color="#9b87f5"
        icon={<Zap className="w-3 h-3 text-[#9b87f5] mr-2" />}
      />
      <ChartSeriesToggle 
        label="Production idéale"
        value={showClearSky}
        onChange={setShowClearSky}
        color="#D4E157"
        icon={<Sun className="w-3 h-3 text-[#D4E157] mr-2" />}
      />
    </>
  );
};
