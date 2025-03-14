import React, { useRef, useState, useEffect, useMemo } from 'react';
import { ShellyEMData, ShellyConfig } from '@/lib/types';
import { Group } from '@visx/group';
import { useSpring, animated } from '@react-spring/web';
import { curveBasis } from '@visx/curve';
import { LinePath } from '@visx/shape';
import { scaleLinear } from '@visx/scale';
import { Text } from '@visx/text';
import { GridRows, GridColumns } from '@visx/grid';
import { LinearGradient } from '@visx/gradient';
import { localPoint } from '@visx/event';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { Line, Circle, Arc } from '@visx/shape';
import { RectClipPath } from '@visx/clip-path';
import { GradientOrangeRed, GradientPurpleRed } from '@visx/gradient';
import { useTooltip } from '@visx/tooltip';

interface NodePosition {
  x: number;
  y: number;
  radius: number;
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
  label?: string;
  power: number;
  unit: string;
  color: string;
  icon?: React.ReactNode;
  tooltip?: string;
  direction?: 'in' | 'out';
}

interface EnergyFlowProps {
  width: number;
  height: number;
  data: ShellyEMData;
  config?: ShellyConfig;
  margin?: { top: number; right: number; bottom: number; left: number };
}

export function VisxRealtimeEnergyFlow({
  width,
  height,
  data,
  config,
  margin = { top: 40, right: 40, bottom: 40, left: 40 }
}: EnergyFlowProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerWidth = width;
  const containerHeight = height;
  
  const nodeWidth = 100;
  const CENTER_RADIUS = 40;
  const OUTER_RADIUS = 50;
  const INNER_RADIUS = 30;
  const ICON_SIZE = 32;

  const { tooltipData, tooltipLeft, tooltipTop, showTooltip, hideTooltip } = useTooltip();
  const tooltipContainerRef = useRef<HTMLDivElement>(null);

  const xScale = scaleLinear({
    domain: [0, 1],
    range: [margin.left, containerWidth - margin.right],
  });
  
  const yScale = scaleLinear({
    domain: [0, 1],
    range: [containerHeight - margin.bottom, margin.top],
  });

  const strokeScale = scaleLinear({
    domain: [0, 5], // 0-5 kWh range
    range: [2, 15], // 2-15px stroke width
  });

  const nodes: Record<string, NodePosition> = {
    PV: { x: containerWidth / 2, y: margin.top + CENTER_RADIUS + 20, radius: CENTER_RADIUS },
    GRID: { x: margin.left + CENTER_RADIUS + 40, y: containerHeight - margin.bottom - CENTER_RADIUS - 40, radius: CENTER_RADIUS },
    MAISON: { x: containerWidth - margin.right - CENTER_RADIUS - 40, y: containerHeight - margin.bottom - CENTER_RADIUS - 40, radius: CENTER_RADIUS },
  };

  const createBezierPath = (source: string, target: string) => {
    const start = nodes[source];
    const end = nodes[target];
    
    if (!start || !end) return '';
    
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const midX = start.x + dx / 2;
    const midY = start.y + dy / 2;
    
    const curveStrength = 50;
    
    if (source === 'PV' && target === 'MAISON') {
      return `M${start.x},${start.y + start.radius} 
              C${start.x + curveStrength},${midY}, 
                ${end.x - curveStrength},${midY}, 
                ${end.x},${end.y - end.radius}`;
    }
    
    if (source === 'PV' && target === 'GRID') {
      return `M${start.x},${start.y + start.radius} 
              C${start.x - curveStrength},${midY}, 
                ${end.x + curveStrength},${midY}, 
                ${end.x + end.radius},${end.y}`;
    }
    
    if (source === 'GRID' && target === 'MAISON') {
      return `M${start.x + start.radius},${start.y} 
              C${midX},${start.y - curveStrength}, 
                ${midX},${end.y - curveStrength}, 
                ${end.x - end.radius},${end.y}`;
    }
    
    return `M${start.x},${start.y}
            C${start.x},${midY}, 
              ${end.x},${midY}, 
              ${end.x},${end.y}`;
  };

  const processData = () => {
    if (!data) return { donutsData: [], fluxData: [] };
    
    const pvPower = data.pv_power || 0;
    const gridPower = data.power || 0;
    const isGridImporting = gridPower > 0;
    const isGridExporting = gridPower < 0;
    
    const gridToHome = isGridImporting ? Math.abs(gridPower) : 0;
    const pvToGrid = isGridExporting ? Math.abs(gridPower) : 0;
    const pvToHome = Math.max(0, pvPower - pvToGrid);
    const totalConsumption = pvToHome + gridToHome;
    
    const donutsData: DonutData[] = [
      {
        id: "PV",
        label: "Photovoltaïque",
        power: pvPower,
        unit: "W",
        color: "#10b981",
        tooltip: `Production PV: ${pvPower}W`,
        direction: pvPower > 0 ? 'out' : 'in'
      },
      {
        id: "MAISON",
        label: "Maison",
        power: totalConsumption,
        unit: "W",
        color: "#f97316",
        tooltip: `Consommation totale: ${totalConsumption}W`,
        direction: 'in'
      },
      {
        id: "GRID",
        label: "Réseau",
        power: Math.abs(gridPower),
        unit: "W",
        color: isGridImporting ? "#3b82f6" : "#ef4444",
        tooltip: `${isGridImporting ? 'Import' : 'Export'} réseau: ${Math.abs(gridPower)}W`,
        direction: isGridImporting ? 'out' : 'in'
      }
    ];

    const fluxData: FluxData[] = [];

    if (pvToHome > 0) {
      fluxData.push({ 
        source: "PV", 
        target: "MAISON", 
        kwh: pvToHome / 1000,
        title: "Autoconsommation",
        watts: pvToHome
      });
    }

    if (isGridImporting && gridToHome > 0) {
      fluxData.push({ 
        source: "GRID", 
        target: "MAISON", 
        kwh: gridToHome / 1000,
        title: "Consommation",
        watts: gridToHome
      });
    }

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
  
  const flowAnimation = useSpring({
    from: { dashOffset: 0 },
    to: { dashOffset: -16 },
    loop: true,
    config: { duration: 2000 }
  });

  const getGradientId = (source: string, target: string) => {
    return `gradient-${source.toLowerCase()}-${target.toLowerCase()}`;
  };

  const getFlowColors = (source: string, target: string) => {
    if (source === 'PV' && target === 'MAISON') return ['#10b981', '#047857'];
    if (source === 'PV' && target === 'GRID') return ['#10b981', '#4ade80'];
    if (source === 'GRID' && target === 'MAISON') return ['#3b82f6', '#1d4ed8'];
    return ['#9ca3af', '#374151'];
  };

  const getFlowMarkers = (source: string) => {
    if (source === 'PV') return 'url(#arrowGreen)';
    if (source === 'GRID') return 'url(#arrowBlue)';
    return 'url(#arrowGray)';
  };

  useEffect(() => {
    console.log('VisxRealtimeEnergyFlow rendered with data:', data);
    console.log('Processed flux data:', fluxData);
  }, [data, fluxData]);

  return (
    <div
      ref={tooltipContainerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%'
      }}
    >
      <svg
        ref={svgRef}
        width={containerWidth}
        height={containerHeight}
        overflow="visible"
      >
        <defs>
          <linearGradient id="gradient-pv-maison" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          
          <linearGradient id="gradient-pv-grid" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#4ade80" />
          </linearGradient>
          
          <linearGradient id="gradient-grid-maison" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          
          <marker
            id="arrowGreen"
            viewBox="0 0 10 10"
            refX="1"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
          </marker>
          
          <marker
            id="arrowBlue"
            viewBox="0 0 10 10"
            refX="1"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
          </marker>
          
          <marker
            id="arrowGray"
            viewBox="0 0 10 10"
            refX="1"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#9ca3af" />
          </marker>
          
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        <Group>
          {fluxData.map((flow, i) => (
            <g key={`flow-${i}`}>
              <animated.path
                d={createBezierPath(flow.source, flow.target)}
                fill="none"
                stroke={`url(#gradient-${flow.source.toLowerCase()}-${flow.target.toLowerCase()})`}
                strokeWidth={strokeScale(Math.max(0.1, flow.kwh))}
                strokeLinecap="round"
                strokeDasharray="8 8"
                strokeDashoffset={flowAnimation.dashOffset}
                filter="url(#glow)"
                markerEnd={getFlowMarkers(flow.source)}
              />
              
              <g transform={`translate(${(nodes[flow.source].x + nodes[flow.target].x) / 2}, ${(nodes[flow.source].y + nodes[flow.target].y) / 2})`}>
                <rect
                  x="-40"
                  y="-15"
                  width="80"
                  height="30"
                  rx="15"
                  fill="white"
                  fillOpacity="0.8"
                  stroke={flow.source === 'PV' ? '#10b981' : '#3b82f6'}
                  strokeWidth="1"
                />
                <Text
                  textAnchor="middle"
                  verticalAnchor="middle"
                  y={-3}
                  fontSize={10}
                  fontWeight="bold"
                  fill="#374151"
                >
                  {flow.title}
                </Text>
                <Text
                  textAnchor="middle"
                  verticalAnchor="middle"
                  y={9}
                  fontSize={9}
                  fill="#4b5563"
                >
                  {`${flow.watts.toLocaleString()} W`}
                </Text>
              </g>
            </g>
          ))}
          
          {donutsData.map((node) => (
            <g key={node.id} transform={`translate(${nodes[node.id].x}, ${nodes[node.id].y})`}>
              <circle
                r={OUTER_RADIUS}
                fill="white"
                fillOpacity={0.8}
                stroke="#f1f5f9"
                strokeWidth={2}
              />
              
              <circle
                r={CENTER_RADIUS}
                fill={node.color}
                fillOpacity={0.15}
                stroke={node.color}
                strokeWidth={2}
                strokeOpacity={0.5}
              />
              
              <g transform={`translate(-${ICON_SIZE/2}, -${ICON_SIZE/2})`}>
                {node.id === 'PV' && (
                  <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                )}
                
                {node.id === 'MAISON' && (
                  <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                )}
                
                {node.id === 'GRID' && (
                  <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                    <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3z" />
                  </svg>
                )}
              </g>
              
              <text
                textAnchor="middle"
                y={CENTER_RADIUS + 25}
                fontSize={12}
                fontWeight="600"
                fill="#334155"
              >
                {node.label}
              </text>
              
              <text
                textAnchor="middle"
                y={5}
                fontSize={14}
                fontWeight="bold"
                fill="#1e293b"
              >
                {node.power.toLocaleString()}
              </text>
              
              <text
                textAnchor="middle"
                y={20}
                fontSize={10}
                fill="#64748b"
              >
                {node.unit}
              </text>
            </g>
          ))}
        </Group>
      </svg>
    </div>
  );
}
