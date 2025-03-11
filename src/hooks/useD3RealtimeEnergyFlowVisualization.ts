
import { useEffect, RefObject, Dispatch, SetStateAction } from 'react';
import * as d3 from 'd3';
import { ShellyEMData } from '@/lib/types';
import { createRealtimeFluxPaths, createRealtimeNodes } from '@/lib/d3RealtimeEnergyFlowUtils';

interface UseD3RealtimeEnergyFlowVisualizationProps {
  svgRef: RefObject<SVGSVGElement>;
  data: ShellyEMData | null;
  isClient: boolean;
  setIsClient: Dispatch<SetStateAction<boolean>>;
}

export function useD3RealtimeEnergyFlowVisualization({
  svgRef,
  data,
  isClient,
  setIsClient
}: UseD3RealtimeEnergyFlowVisualizationProps) {
  // Set isClient to true on client side
  useEffect(() => {
    setIsClient(true);
  }, [setIsClient]);

  // Main D3 visualization effect
  useEffect(() => {
    if (!isClient || !svgRef.current || !data) return;

    // Cleanup function to remove all SVG elements and React components
    const cleanup = () => {
      if (svgRef.current) {
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
      }
    };

    // Clean up existing SVG
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Set dimensions
    const svgWidth = 700;
    const svgHeight = 500;
    svg.attr("width", svgWidth)
       .attr("height", svgHeight)
       .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
       .attr("preserveAspectRatio", "xMidYMid meet");

    // Create definitions for effects
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

    // Define center positions
    const centers = {
      PV:     { x: svgWidth / 2,        y: 120 },
      GRID:   { x: svgWidth / 2 - 240,  y: 380 },
      HOME:   { x: svgWidth / 2 + 240,  y: 380 }
    };

    // Define node radius
    const nodeRadius = 60;

    // Determine flow directions based on current power values
    const isPVProducing = data.pv_power > 6;
    const isGridImporting = data.power > 0;
    const isGridExporting = data.power < 0;
    
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
    
    // Prepare flow data with only titles (no values)
    const flowData = [];
    
    // Add flow: Grid -> Home (when importing)
    if (isGridImporting) {
      flowData.push({
        source: "GRID",
        target: "HOME",
        power: data.power,
        title: "Réseau"
      });
    }
    
    // Add flow: PV -> Home (when producing)
    if (isPVProducing) {
      // Calculate how much of the PV production actually goes to home
      const pvToHome = Math.min(data.pv_power, data.pv_power + Math.min(0, data.power));
      flowData.push({
        source: "PV",
        target: "HOME",
        power: pvToHome,
        title: "Autoconsommation"
      });
    }
    
    // Add flow: PV -> Grid (when exporting excess)
    if (isPVProducing && isGridExporting) {
      // Calculate excess PV power going to grid
      const excessPower = -data.power;
      flowData.push({
        source: "PV",
        target: "GRID",
        power: excessPower,
        title: "Injection"
      });
    }
    
    // Create the flow paths between nodes with only titles
    createRealtimeFluxPaths(svg, flowData, centers, nodeRadius);

    // Add title
    svg.append("text")
      .attr("x", svgWidth / 2)
      .attr("y", 40)
      .attr("text-anchor", "middle")
      .attr("font-size", 18)
      .attr("font-weight", "bold")
      .attr("fill", "#555")
      .text("Flux Énergétique en Temps Réel");

    // Return cleanup function
    return cleanup;
  }, [data, isClient, svgRef]);
}
