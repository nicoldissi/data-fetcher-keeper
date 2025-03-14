import React, { useRef, useState, useEffect, useMemo } from 'react';
import { ShellyEMData, ShellyConfig } from '@/lib/types';
import { Group } from '@visx/group';
import { Arc } from '@visx/shape';
import { Text } from '@visx/text';
import { scaleLinear } from '@visx/scale';
import { LinearGradient } from '@visx/gradient';
import { animated, useSpring } from '@react-spring/web';
import { Sun, HousePlug, Zap } from 'lucide-react';

interface VisxRealtimeEnergyFlowProps {
  data: ShellyEMData | null;
  className?: string;
  configId?: string;
  config?: ShellyConfig | null;
}

interface Center {
  x: number;
  y: number;
}

interface FluxData {
  source: string;
  target: string;
  kwh: number;
  title?: string;
  watts: number; // Power in watts for labeling
}

interface DonutData {
  id: string;
  label: string;
  totalKwh: number;
  ratio: number;
  importTotal?: number;
  exportTotal?: number;
  selfConsumptionRatio?: number;
  color?: string;
  textColor?: string;
  powerValue?: string;
  maxValue?: string;
  pvPower?: number;
  gridPower?: number;
  pvRatio?: number;
  gridRatio?: number;
  importRatio?: number;
  exportRatio?: number;
  isExporting?: boolean;
  isImporting?: boolean;
  homeConsumption?: number;
}

const AnimatedArc = animated(Arc);

export function VisxRealtimeEnergyFlow({ data, className, configId, config }: VisxRealtimeEnergyFlowProps) {
  const [isClient, setIsClient] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  
  const width = 700;
  const height = 500;
  const outerRadius = 60;
  const thickness = 12;
  
  const centers = {
    PV:     { x: width / 2,        y: 120 },
    GRID:   { x: width / 2 - 240,  y: 380 },
    MAISON: { x: width / 2 + 240,  y: 380 }
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  const processData = () => {
    if (!data) return { donutsData: [], fluxData: [] };

    const inverterKVA = config?.inverter_power_kva !== undefined ? Number(config.inverter_power_kva) : 3.0;
    const gridKVA = config?.grid_subscription_kva !== undefined ? Number(config.grid_subscription_kva) : 6.0;
    
    const inverterMaxPower = inverterKVA * 1000;
    const gridMaxPower = gridKVA * 1000;

    const pvPower = data.pv_power;
    const gridPower = Math.abs(data.power);
    
    let realHomeConsumption;
    if (data.power < 0) {
      // If grid power is negative, we're exporting (PV produces more than home consumes)
      realHomeConsumption = data.pv_power - Math.abs(data.power);
    } else {
      // If grid power is positive, we're importing (home consumes more than PV produces)
      realHomeConsumption = data.power + data.pv_power;
    }

    const pvRatio = Math.min(1, data.pv_power / inverterMaxPower);
    const homeRatio = Math.min(1, realHomeConsumption / gridMaxPower);

    const isPVProducing = data.pv_power > 6;
    const isGridImporting = data.power > 0;
    const isGridExporting = data.power < 0;

    // Flow values
    const pvToHome = isPVProducing ? Math.min(pvPower, realHomeConsumption) : 0;
    const pvToGrid = isPVProducing && isGridExporting ? Math.abs(data.power) : 0;
    const gridToHome = isGridImporting ? gridPower : 0;

    const pvToHomeRatio = realHomeConsumption > 0 ? pvToHome / realHomeConsumption : 0;
    const gridToHomeRatio = realHomeConsumption > 0 ? gridToHome / realHomeConsumption : 0;

    const gridExportRatio = isGridExporting ? Math.min(1, Math.abs(data.power) / gridMaxPower) : 0;
    const gridImportRatio = isGridImporting ? Math.min(1, Math.abs(data.power) / gridMaxPower) : 0;

    const donutsData = [
      { 
        id: "PV", 
        label: "", 
        totalKwh: pvPower / 1000, 
        ratio: pvRatio, 
        selfConsumptionRatio: pvPower > 0 ? (pvToHome / pvPower) * 100 : 0,
        powerValue: `${data.pv_power.toFixed(0)} W`,
        maxValue: `${inverterKVA.toFixed(1)} kW`,
        color: "#66BB6A",
        textColor: "#4CAF50"
      },
      { 
        id: "MAISON", 
        label: "", 
        totalKwh: realHomeConsumption / 1000,
        ratio: Math.min(1, realHomeConsumption / gridMaxPower),
        pvRatio: pvToHomeRatio,
        gridRatio: gridToHomeRatio,
        powerValue: `${realHomeConsumption.toFixed(0)} W`,
        maxValue: `${gridKVA.toFixed(1)} kW`,
        pvPower: pvToHome,
        gridPower: gridToHome,
        homeConsumption: realHomeConsumption,
        color: "#F97316",
        textColor: "#EA580C"
      },
      { 
        id: "GRID", 
        label: "", 
        totalKwh: gridPower / 1000, 
        ratio: 1,
        importRatio: gridImportRatio,
        exportRatio: gridExportRatio,
        isExporting: isGridExporting,
        isImporting: isGridImporting,
        importTotal: isGridImporting ? gridPower / 1000 : 0, 
        exportTotal: isGridExporting ? gridPower / 1000 : 0,
        powerValue: `${Math.abs(data.power).toFixed(0)} W`,
        maxValue: `${gridKVA.toFixed(1)} kW`,
        color: "#42A5F5",
        textColor: "#2196F3"
      }
    ];

    const fluxData: FluxData[] = [];

    // PV to Home flow
    if (pvToHome > 0) {
      fluxData.push({ 
        source: "PV", 
        target: "MAISON", 
        kwh: pvToHome / 1000,
        title: "Autoconsommation",
        watts: pvToHome
      });
    }

    // Grid to Home flow
    if (isGridImporting && gridToHome > 0) {
      fluxData.push({ 
        source: "GRID", 
        target: "MAISON", 
        kwh: gridToHome / 1000,
        title: "Consommation",
        watts: gridToHome
      });
    }

    // PV to Grid flow (export)
    if (isGridExporting && pvToGrid > 0) {
      fluxData.push({ 
        source: "PV", 
        target: "GRID", 
        kwh: pvToGrid / 1000,
        title: "Injection",
        watts: pvToGrid
      });
    }

    return { donutsData, fluxData };
  };

  const { donutsData, fluxData } = useMemo(() => processData(), [data, config]);
  
  // Simple constant animation for flow
  const flowAnimation = useSpring({
    from: { dashOffset: 16 },
    to: { dashOffset: 0 },
    loop: true,
    config: { duration: 2000 }
  });

  const createBezierPath = useMemo(() => {
    const pathCache: Record<string, string> = {};
    
    return (source: string, target: string) => {
      const cacheKey = `${source}-${target}`;
      
      if (pathCache[cacheKey]) {
        return pathCache[cacheKey];
      }
      
      const s = centers[source as keyof typeof centers];
      const t = centers[target as keyof typeof centers];
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const offset = outerRadius + 5;
      const ratioStart = offset / dist;
      const x1 = s.x + dx * ratioStart;
      const y1 = s.y + dy * ratioStart;
      const ratioEnd = (dist - offset) / dist;
      const x2 = s.x + dx * ratioEnd;
      const y2 = s.y + dy * ratioEnd;
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2 - 40;
      
      const path = `M ${x1},${y1} Q ${mx},${my} ${x2},${y2}`;
      pathCache[cacheKey] = path;
      
      return path;
    };
  }, [centers, outerRadius]);

  const getFluxColor = (source: string) => {
    if(source === "PV") return "#66BB6A";
    if(source === "GRID") return "#42A5F5";
    return "#888";
  };

  const kwhValues = fluxData.map(f => f.kwh);
  const maxKwh = Math.max(...kwhValues, 0.1);
  const minKwh = Math.min(...kwhValues, 0.1);
  const strokeScale = scaleLinear<number>({
    domain: [Math.max(0.1, minKwh), Math.max(1, maxKwh)],
    range: [2, 8],
    clamp: true
  });

  if (!data) {
    return (
      <div className="h-[500px] flex items-center justify-center">
        <p className="text-gray-500">En attente de données en temps réel...</p>
      </div>
    );
  }

  if (!isClient) {
    return null;
  }

  return (
    <div className={className}>
      <div className="flex justify-center relative">
        <svg 
          ref={svgRef} 
          width={width} 
          height={height} 
          viewBox={`0 0 ${width} ${height}`}
          className="max-w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <Text
            x={width / 2}
            y={40}
            textAnchor="middle"
            verticalAnchor="middle"
            style={{ fontSize: 18, fontWeight: 'bold', fill: '#555' }}
          >
            Flux Énergétique en Temps Réel
          </Text>

          {fluxData.map((flow, i) => (
            <g key={`flow-${i}`}>
              {/* The path with simplified animation */}
              <animated.path
                d={createBezierPath(flow.source, flow.target)}
                fill="none"
                stroke={getFluxColor(flow.source)}
                strokeWidth={strokeScale(Math.max(0.1, flow.kwh))}
                strokeLinecap="round"
                strokeDasharray="8 8"
                strokeDashoffset={flowAnimation.dashOffset}
                filter="url(#glow)"
              />
              
              {/* Flow label */}
              {(() => {
                const s = centers[flow.source as keyof typeof centers];
                const t = centers[flow.target as keyof typeof centers];
                const dx = t.x - s.x;
                const dy = t.y - s.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const offset = outerRadius + 5;
                const ratioStart = offset / dist;
                const x1 = s.x + dx * ratioStart;
                const y1 = s.y + dy * ratioStart;
                const ratioEnd = (dist - offset) / dist;
                const x2 = s.x + dx * ratioEnd;
                const y2 = s.y + dy * ratioEnd;
                const mx = (x1 + x2) / 2;
                const my = (y1 + y2) / 2 - 10;
                
                const tParam = 0.5;
                const bezierX = (1-tParam)*(1-tParam)*x1 + 2*(1-tParam)*tParam*mx + tParam*tParam*x2;
                const bezierY = (1-tParam)*(1-tParam)*y1 + 2*(1-tParam)*tParam*my + tParam*tParam*y2;
                
                const title = flow.title || "";
                const valueText = `${flow.watts.toFixed(0)} W`;
                const labelWidth = Math.max(90, Math.max(title.length, valueText.length) * 7);
                
                const borderColor = flow.source === "PV" ? "#4CAF50" : flow.source === "GRID" ? "#2196F3" : "#888";
                const textColor = flow.source === "PV" ? "#4CAF50" : flow.source === "GRID" ? "#2196F3" : "#555";
                
                return (
                  <g key={`label-${i}`}>
                    <rect
                      x={bezierX - labelWidth/2}
                      y={bezierY - 25}
                      width={labelWidth}
                      height={40}
                      rx={12}
                      fill="white"
                      stroke={borderColor}
                      strokeWidth={1}
                      fillOpacity={0.9}
                      filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.1))"
                    />
                    <Text
                      x={bezierX}
                      y={bezierY - 6}
                      textAnchor="middle"
                      verticalAnchor="middle"
                      style={{ fontSize: 12, fontWeight: 500, fill: textColor }}
                    >
                      {title}
                    </Text>
                    <Text
                      x={bezierX}
                      y={bezierY + 12}
                      textAnchor="middle"
                      verticalAnchor="middle"
                      style={{ fontSize: 13, fontWeight: 'bold', fill: textColor }}
                    >
                      {valueText}
                    </Text>
                  </g>
                );
              })()}
            </g>
          ))}

          {donutsData.map((donut) => {
            const center = centers[donut.id as keyof typeof centers];
            return (
              <Group key={donut.id} left={center.x} top={center.y}>
                <circle
                  r={outerRadius - thickness / 2}
                  fill="white"
                  stroke="#e2e8f0"
                  strokeWidth={thickness}
                />

                {donut.id === "PV" && (
                  <>
                    <Arc
                      innerRadius={outerRadius - thickness}
                      outerRadius={outerRadius}
                      startAngle={-120 * (Math.PI / 180)}
                      endAngle={120 * (Math.PI / 180)}
                      fill="#8E9196"
                      fillOpacity={0.2}
                    />
                    {donut.ratio > 0 && (
                      <Arc
                        innerRadius={outerRadius - thickness}
                        outerRadius={outerRadius}
                        startAngle={-120 * (Math.PI / 180)}
                        endAngle={-120 * (Math.PI / 180) + (donut.ratio * 240 * (Math.PI / 180))}
                        fill={donut.color || "#66BB6A"}
                      />
                    )}
                    <foreignObject
                      width={24}
                      height={24}
                      x={-12}
                      y={-36}
                      style={{ overflow: 'visible' }}
                    >
                      <Sun size={24} color={donut.textColor} />
                    </foreignObject>
                    <Text
                      x={0}
                      y={10}
                      textAnchor="middle"
                      verticalAnchor="middle"
                      style={{ fontSize: 18, fontWeight: 500, fill: donut.textColor }}
                    >
                      {donut.powerValue}
                    </Text>
                    <Text
                      x={65}
                      y={35}
                      textAnchor="middle"
                      verticalAnchor="middle"
                      style={{ fontSize: 12, fontWeight: 400, fill: donut.textColor }}
                    >
                      {donut.maxValue}
                    </Text>
                  </>
                )}

                {donut.id === "MAISON" && (
                  <>
                    <Arc
                      innerRadius={outerRadius - thickness}
                      outerRadius={outerRadius}
                      startAngle={-120 * (Math.PI / 180)}
                      endAngle={120 * (Math.PI / 180)}
                      fill="#8E9196"
                      fillOpacity={0.2}
                    />
                    {donut.ratio > 0 && donut.homeConsumption && donut.homeConsumption > 0 && (
                      <>
                        <Arc
                          innerRadius={outerRadius - thickness}
                          outerRadius={outerRadius}
                          startAngle={-120 * (Math.PI / 180)}
                          endAngle={-120 * (Math.PI / 180) + (donut.gridRatio || 0) * donut.ratio * 240 * (Math.PI / 180)}
                          fill="#42A5F5"
                        />
                        <Arc
                          innerRadius={outerRadius - thickness}
                          outerRadius={outerRadius}
                          startAngle={-120 * (Math.PI / 180) + (donut.gridRatio || 0) * donut.ratio * 240 * (Math.PI / 180)}
                          endAngle={-120 * (Math.PI / 180) + donut.ratio * 240 * (Math.PI / 180)}
                          fill="#66BB6A"
                        />
                      </>
                    )}
                    <foreignObject
                      width={24}
                      height={24}
                      x={-12}
                      y={-36}
                      style={{ overflow: 'visible' }}
                    >
                      <HousePlug size={24} color={donut.textColor} />
                    </foreignObject>
                    <Text
                      x={0}
                      y={10}
                      textAnchor="middle"
                      verticalAnchor="middle"
                      style={{ fontSize: 18, fontWeight: 500, fill: donut.textColor }}
                    >
                      {donut.powerValue}
                    </Text>
                    <Text
                      x={65}
                      y={35}
                      textAnchor="middle"
                      verticalAnchor="middle"
                      style={{ fontSize: 12, fontWeight: 400, fill: donut.textColor }}
                    >
                      {donut.maxValue}
                    </Text>
                  </>
                )}

                {donut.id === "GRID" && (
                  <>
                    <Arc
                      innerRadius={outerRadius - thickness}
                      outerRadius={outerRadius}
                      startAngle={-120 * (Math.PI / 180)}
                      endAngle={120 * (Math.PI / 180)}
                      fill="#8E9196"
                      fillOpacity={0.2}
                    />
                    {donut.isImporting && donut.importRatio && donut.importRatio > 0 && (
                      <Arc
                        innerRadius={outerRadius - thickness}
                        outerRadius={outerRadius}
                        startAngle={-120 * (Math.PI / 180)}
                        endAngle={-120 * (Math.PI / 180) + (donut.importRatio * 240 * (Math.PI / 180))}
                        fill={donut.color || "#42A5F5"}
                      />
                    )}
                    {donut.isExporting && donut.exportRatio && donut.exportRatio > 0 && (
                      <Arc
                        innerRadius={outerRadius - thickness}
                        outerRadius={outerRadius}
                        startAngle={-120 * (Math.PI / 180)}
                        endAngle={-120 * (Math.PI / 180) + (donut.exportRatio * 240 * (Math.PI / 180))}
                        fill={donut.color || "#42A5F5"}
                      />
                    )}
                    <foreignObject
                      width={24}
                      height={24}
                      x={-12}
                      y={-36}
                      style={{ overflow: 'visible' }}
                    >
                      <Zap size={24} color={donut.textColor} />
                    </foreignObject>
                    <Text
                      x={0}
                      y={10}
                      textAnchor="middle"
                      verticalAnchor="middle"
                      style={{ fontSize: 18, fontWeight: 500, fill: donut.textColor }}
                    >
                      {donut.powerValue}
                    </Text>
                    <Text
                      x={65}
                      y={35}
                      textAnchor="middle"
                      verticalAnchor="middle"
                      style={{ fontSize: 12, fontWeight: 400, fill: donut.textColor }}
                    >
                      {donut.maxValue}
                    </Text>
                    {donut.isExporting && (
                      <Text
                        x={-65}
                        y={35}
                        textAnchor="middle"
                        verticalAnchor="middle"
                        style={{ fontSize: 12, fontWeight: 500, fill: donut.textColor }}
                      >
                        Injection
                      </Text>
                    )}
                    {donut.isImporting && (
                      <Text
                        x={-65}
                        y={35}
                        textAnchor="middle"
                        verticalAnchor="middle"
                        style={{ fontSize: 12, fontWeight: 500, fill: donut.textColor }}
                      >
                        Consommation
                      </Text>
                    )}
                  </>
                )}
              </Group>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

