
import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Circle, Text, Line, Group, Rect, Arrow, Arc } from 'react-konva';
import { House, Factory, Sun } from 'lucide-react';
import { ShellyEMData } from '@/lib/types';
import { useDailyEnergyTotals } from '@/hooks/useDailyEnergyTotals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EnergyFlowChartDarkProps {
  data: ShellyEMData | null;
  configId?: string;
  className?: string;
}

export function EnergyFlowChartDark({ data: currentData, configId, className }: EnergyFlowChartDarkProps) {
  const [width, setWidth] = useState(600);
  const [height, setHeight] = useState(400);
  const containerRef = useRef<HTMLDivElement>(null);
  const { dailyTotals } = useDailyEnergyTotals(configId);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width: containerWidth } = containerRef.current.getBoundingClientRect();
        setWidth(containerWidth);
        // Maintain aspect ratio
        setHeight(containerWidth * 0.67);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  if (!currentData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Flux d'énergie en temps réel</CardTitle>
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

  // Constants
  const nodeRadius = 38;
  const arrowWidth = 3;

  // Calculate arrow widths based on power (min 3px, max 15px)
  const calculateArrowWidth = (watts: number) => {
    const absWatts = Math.abs(watts);
    return Math.min(15, Math.max(3, absWatts / 200)); // Scale width
  };

  // Node positions and data
  const nodes = {
    pv: {
      x: width * 0.5,
      y: height * 0.25, // Top center
      label: 'Photovoltaïque',
      value: `${currentData.pv_power.toFixed(1)} W`,
      color: '#66BB6A'
    },
    grid: {
      x: width * 0.05, // Moved more to the left from 0.1 to 0.05
      y: height * 0.8,
      label: 'Réseau',
      value: `${Math.abs(currentData.power).toFixed(1)} W`,
      color: '#42A5F5'
    },
    home: {
      x: width * 0.96, // Moved more to the right from 0.95 to 0.96
      y: height * 0.8,
      label: 'Maison',
      value: `${(currentData.power + currentData.pv_power).toFixed(1)} W`,
      color: '#F97316'
    }
  };

  // Calculate flow values for arrows
  const flows = {
    grid: {
      active: currentData.power !== 0,
      import: currentData.power > 0,
      watts: Math.abs(currentData.power)
    },
    pv: {
      active: currentData.pv_power > 0,
      watts: currentData.pv_power
    }
  };

  // Daily energy totals for display
  const gridImportKwh = (dailyTotals.importFromGrid / 1000).toFixed(2);
  const pvTotalKwh = (dailyTotals.production / 1000).toFixed(2);
  const gridExportKwh = (dailyTotals.injection / 1000).toFixed(2);
  const homeConsumptionKwh = (dailyTotals.consumption / 1000).toFixed(2);

  // Helper function to format text
  const formatWatts = (watts: number) => {
    return Math.abs(watts) >= 1000 
      ? `${(Math.abs(watts) / 1000).toFixed(2)} kW` 
      : `${Math.abs(watts).toFixed(0)} W`;
  };

  // Gauge calculation helpers
  function calculatePVGaugeAngle(currentWatts: number, maxPower: number) {
    // Angle 0 is right position, we want the gauge to sweep from 0 to 240 degrees
    const percentage = Math.min(100, (currentWatts / maxPower) * 100);
    return (percentage / 100) * 240; // 240 degrees arc for gauge
  }

  function calculateGridGaugeAngle(currentWatts: number, maxPower: number) {
    // Grid power can be negative (export) or positive (import)
    // We want to show export on the left side (-120 to 0 degrees) and import on the right (0 to 120 degrees)
    const percentage = Math.min(100, Math.abs(currentWatts) / maxPower * 100);
    const angle = (percentage / 100) * 120; // 120 degrees max each way
    
    // If current is negative (export), angle goes to the left
    return currentWatts < 0 ? -angle : angle;
  }

  const pvGaugeAngle = calculatePVGaugeAngle(currentData.pv_power, 3000); // Assuming 3kW max solar
  const maxGridPower = 6; // Maximum grid power in kVA
  const gridGaugeAngle = calculateGridGaugeAngle(currentData.power, maxGridPower * 1000);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Flux d'énergie en temps réel</CardTitle>
      </CardHeader>
      <CardContent ref={containerRef} className="flex justify-center">
        <Stage width={width} height={height}>
          <Layer>
            {/* Title */}
            <Text 
              text="Flux d'énergie"
              x={width / 2}
              y={20}
              fontSize={18}
              fill="#888"
              align="center"
              width={width}
            />

            {/* Lines connecting nodes */}
            {/* PV to Home connection */}
            {flows.pv.active && (
              <Arrow
                points={[
                  nodes.pv.x, nodes.pv.y + nodeRadius,
                  nodes.home.x, nodes.home.y - nodeRadius
                ]}
                stroke="#66BB6A"
                strokeWidth={calculateArrowWidth(flows.pv.watts)}
                fill="#66BB6A"
                dash={[10, 5]}
              />
            )}

            {/* Grid to Home connection (import) or Home to Grid (export) */}
            {flows.grid.active && (
              <Arrow
                points={[
                  flows.grid.import ? nodes.grid.x + nodeRadius : nodes.home.x - nodeRadius,
                  flows.grid.import ? nodes.grid.y : nodes.home.y,
                  flows.grid.import ? nodes.home.x - nodeRadius : nodes.grid.x + nodeRadius,
                  flows.grid.import ? nodes.home.y : nodes.grid.y
                ]}
                stroke={flows.grid.import ? "#FF5252" : "#1EAEDB"}
                strokeWidth={calculateArrowWidth(flows.grid.watts)}
                fill={flows.grid.import ? "#FF5252" : "#1EAEDB"}
              />
            )}

            {/* PV Node with solar icon */}
            <Group x={nodes.pv.x} y={nodes.pv.y}>
              <Circle radius={nodeRadius} fill="#222" stroke="#66BB6A" strokeWidth={2} />
              
              {/* Solar gauge arc background (full circle) */}
              <Arc
                x={0}
                y={0}
                angle={240}
                innerRadius={nodeRadius - 4}
                outerRadius={nodeRadius}
                fill="#333"
                rotation={-120} // Start at upper left
              />
              
              {/* Active solar gauge arc */}
              <Arc
                x={0}
                y={0}
                angle={pvGaugeAngle}
                innerRadius={nodeRadius - 4}
                outerRadius={nodeRadius}
                fill="#4CAF50"
                rotation={-120} // Start at upper left
              />
              
              {/* For PV gauge labels */}
              <Text
                x={-nodeRadius * 0.866}
                y={45} // Changed from 30 to 45 (15px lower)
                text="0"
                fontSize={9}
                fill="#666"
                align="left"
              />
              
              <Text
                x={nodeRadius * 0.866}
                y={45} // Changed from 30 to 45 (15px lower)
                text="3kW"
                fontSize={9}
                fill="#666"
                align="right"
              />
              
              {/* PV Icon */}
              <Text
                text="☀️"
                x={0}
                y={0}
                fontSize={22}
                fill="#FFF"
                align="center"
                verticalAlign="middle"
                width={20}
                height={20}
                offsetX={10}
                offsetY={10}
              />
              
              {/* Label */}
              <Text
                text={nodes.pv.label}
                x={0}
                y={-nodeRadius - 20}
                fontSize={12}
                fill="#CCC"
                align="center"
                verticalAlign="middle"
                width={120}
                height={20}
                offsetX={60}
                offsetY={10}
              />
              
              {/* Value */}
              <Text
                text={nodes.pv.value}
                x={0}
                y={nodeRadius + 10}
                fontSize={14}
                fontStyle="bold"
                fill={nodes.pv.color}
                align="center"
                verticalAlign="middle"
                width={100}
                height={20}
                offsetX={50}
                offsetY={10}
              />
              
              {/* Daily total kWh */}
              <Text
                text={`${pvTotalKwh} kWh aujourd'hui`}
                x={0}
                y={nodeRadius + 30}
                fontSize={10}
                fill="#AAA"
                align="center"
                verticalAlign="middle"
                width={150}
                height={20}
                offsetX={75}
                offsetY={10}
              />
            </Group>

            {/* Grid Node */}
            <Group x={nodes.grid.x} y={nodes.grid.y}>
              <Circle radius={nodeRadius} fill="#222" stroke="#42A5F5" strokeWidth={2} />
              
              {/* Grid gauge arc background (full circle) */}
              <Arc
                x={0}
                y={0}
                angle={240}
                innerRadius={nodeRadius - 4}
                outerRadius={nodeRadius}
                fill="#333"
                rotation={-120} // Start at upper left
              />
              
              {/* Active grid gauge arc */}
              <Arc
                x={0}
                y={0}
                angle={Math.abs(gridGaugeAngle)}
                innerRadius={nodeRadius - 4}
                outerRadius={nodeRadius}
                fill={currentData.power < 0 ? "#1EAEDB" : "#ea384c"}
                rotation={currentData.power < 0 ? -120 : 0} // Start at upper left for export, right for import
              />
              
              {/* For grid gauge labels */}
              <Text
                x={-nodeRadius * 0.866}
                y={45} // Changed from 30 to 45 (15px lower)
                text={`-${maxGridPower}kVA`}
                fontSize={9}
                fill="#1EAEDB"
                align="left"
              />
              
              <Text
                x={nodeRadius * 0.866}
                y={45} // Changed from 30 to 45 (15px lower)
                text={`+${maxGridPower}kVA`}
                fontSize={9}
                fill="#ea384c"
                align="right"
              />
              
              {/* Grid Icon */}
              <Text
                text="⚡"
                x={0}
                y={0}
                fontSize={22}
                fill="#FFF"
                align="center"
                verticalAlign="middle"
                width={20}
                height={20}
                offsetX={10}
                offsetY={10}
              />
              
              {/* Label */}
              <Text
                text={nodes.grid.label}
                x={0}
                y={-nodeRadius - 20}
                fontSize={12}
                fill="#CCC"
                align="center"
                verticalAlign="middle"
                width={60}
                height={20}
                offsetX={30}
                offsetY={10}
              />
              
              {/* Value */}
              <Text
                text={`${formatWatts(flows.grid.watts)}${currentData.power < 0 ? ' ▼' : ' ▲'}`}
                x={0}
                y={nodeRadius + 10}
                fontSize={14}
                fontStyle="bold"
                fill={currentData.power < 0 ? "#1EAEDB" : "#ea384c"}
                align="center"
                verticalAlign="middle"
                width={100}
                height={20}
                offsetX={50}
                offsetY={10}
              />
              
              {/* Daily kWh */}
              <Text
                text={currentData.power < 0 ? 
                  `${gridExportKwh} kWh exporté` : 
                  `${gridImportKwh} kWh importé`}
                x={0}
                y={nodeRadius + 30}
                fontSize={10}
                fill="#AAA"
                align="center"
                verticalAlign="middle"
                width={120}
                height={20}
                offsetX={60}
                offsetY={10}
              />
            </Group>

            {/* Home Node */}
            <Group x={nodes.home.x} y={nodes.home.y}>
              <Circle radius={nodeRadius} fill="#222" stroke="#F97316" strokeWidth={2} />
              
              {/* Home Icon */}
              <Text
                text="🏠"
                x={0}
                y={0}
                fontSize={22}
                fill="#FFF"
                align="center"
                verticalAlign="middle"
                width={20}
                height={20}
                offsetX={10}
                offsetY={10}
              />
              
              {/* Label */}
              <Text
                text={nodes.home.label}
                x={0}
                y={-nodeRadius - 20}
                fontSize={12}
                fill="#CCC"
                align="center"
                verticalAlign="middle"
                width={60}
                height={20}
                offsetX={30}
                offsetY={10}
              />
              
              {/* Value */}
              <Text
                text={nodes.home.value}
                x={0}
                y={nodeRadius + 10}
                fontSize={14}
                fontStyle="bold"
                fill={nodes.home.color}
                align="center"
                verticalAlign="middle"
                width={100}
                height={20}
                offsetX={50}
                offsetY={10}
              />
              
              {/* Daily kWh */}
              <Text
                text={`${homeConsumptionKwh} kWh aujourd'hui`}
                x={0}
                y={nodeRadius + 30}
                fontSize={10}
                fill="#AAA"
                align="center"
                verticalAlign="middle"
                width={130}
                height={20}
                offsetX={65}
                offsetY={10}
              />
            </Group>
          </Layer>
        </Stage>
      </CardContent>
    </Card>
  );
}
