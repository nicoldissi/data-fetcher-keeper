
import { useRef, useState, useEffect } from 'react';
import { ShellyEMData } from '@/lib/types';
import { createRealtimeFluxPaths, createRealtimeNodes } from '@/lib/d3RealtimeEnergyFlowUtils';
import * as d3 from 'd3';

interface D3RealtimeEnergyFlowProps {
  data: ShellyEMData | null;
  size: { width: number; height: number };
}

export function D3RealtimeEnergyFlow({ data, size }: D3RealtimeEnergyFlowProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [flowAnimations, setFlowAnimations] = useState({
    gridToHome: false,
    solarToHome: false,
    solarToGrid: false
  });
  
  useEffect(() => {
    if (!data || !svgRef.current) return;
    
    const isPVProducing = data.pv_power > 6;
    const homeConsumption = Math.max(0, data.pv_power + data.power);
    
    const isGridImporting = data.power > 0;
    const isGridExporting = data.power < 0;
    
    setFlowAnimations({
      gridToHome: isGridImporting,
      solarToHome: isPVProducing,
      solarToGrid: isPVProducing && isGridExporting
    });
    
    // Create the SVG and nodes
    renderEnergyFlow();
  }, [data, size]);
  
  const renderEnergyFlow = () => {
    if (!svgRef.current || !data) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    const { width, height } = size;
    const nodeRadius = Math.min(60, width * 0.15);
    
    // Create filter for glow effect
    const defs = svg.append("defs");
    defs.append("filter")
      .attr("id", "glow")
      .html(`
        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      `);
    
    // Node centers based on available space
    const centers = {
      PV: { x: width * 0.5, y: height * 0.2 },
      GRID: { x: width * 0.15, y: height * 0.7 },
      HOME: { x: width * 0.85, y: height * 0.7 }
    };
    
    // Get maximum PV capacity from inverter (in W)
    // Default to 6000 W (6 kW) if not specified
    const maxPVCapacity = data.shelly_config_id && window.__INITIAL_DATA__?.configs?.[data.shelly_config_id]?.inverter_power_kva 
      ? window.__INITIAL_DATA__.configs[data.shelly_config_id].inverter_power_kva * 1000 
      : 6000;
    
    // Calculate PV production percentage
    const pvProductionPercentage = Math.min(100, (data.pv_power / maxPVCapacity) * 100);
    
    // Prepare data for nodes with active power values in W
    const nodesData = [
      {
        id: "PV",
        label: "PV",
        value: `${Math.round(data.pv_power)} W`,
        color: '#66BB6A',
        gaugeValue: pvProductionPercentage,
        maxCapacity: maxPVCapacity
      },
      {
        id: "GRID",
        label: "Réseau",
        value: `${Math.round(Math.abs(data.power))} W`,
        color: '#42A5F5',
        direction: data.power >= 0 ? 'import' : 'export' as 'import' | 'export',
        power: data.power
      },
      {
        id: "HOME",
        label: "Maison",
        value: `${Math.round(data.pv_power + Math.max(0, data.power))} W`,
        color: '#F97316'
      }
    ];
    
    // Create nodes (circles with labels)
    createRealtimeNodes(svg, nodesData, centers, nodeRadius);
    
    // Prepare data for energy flows (only with titles, no values)
    const flowData = [];
    
    // Add active flows based on current energy state
    if (flowAnimations.gridToHome) {
      flowData.push({
        source: "GRID",
        target: "HOME",
        power: data.power,
        title: "Réseau"
      });
    }
    
    if (flowAnimations.solarToHome) {
      // Calculate how much of the PV production actually goes to home
      const pvToHome = Math.min(data.pv_power, data.pv_power + Math.min(0, data.power));
      flowData.push({
        source: "PV",
        target: "HOME",
        power: pvToHome,
        title: "Autoconsommation"
      });
    }
    
    if (flowAnimations.solarToGrid) {
      // Calculate excess PV power going to grid
      const excessPower = -data.power;
      flowData.push({
        source: "PV",
        target: "GRID",
        power: excessPower,
        title: "Injection"
      });
    }
    
    // Create the flow paths between nodes with only titles (no values)
    createRealtimeFluxPaths(svg, flowData, centers, nodeRadius);
  };
  
  return (
    <svg 
      ref={svgRef} 
      width={size.width} 
      height={size.height} 
      className="overflow-visible"
    />
  );
}
