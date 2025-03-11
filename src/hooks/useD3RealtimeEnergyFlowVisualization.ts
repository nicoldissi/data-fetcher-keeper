
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

    const pvPower = data.pv_power / 1000; // Convert to kW
    const gridPower = Math.abs(data.power) / 1000; // Convert to kW
    const homeConsumption = (data.pv_power + Math.max(0, data.power)) / 1000; // Convert to kW
    
    // Determine flow directions based on current power values
    const isPVProducing = data.pv_power > 6;
    const isGridImporting = data.power > 0;
    const isGridExporting = data.power < 0;
    
    // Calculate how much of the PV production goes to home vs. grid
    const pvToHome = isPVProducing ? Math.min(pvPower, pvPower + (isGridExporting ? gridPower : 0)) : 0;
    const pvToGrid = isPVProducing && isGridExporting ? Math.abs(Math.max(0, pvPower - homeConsumption)) : 0;
    const gridToHome = isGridImporting ? gridPower : 0;
    
    // Calculate ratios for visuals
    const pvToHomeRatio = pvPower > 0 ? pvToHome / pvPower : 0;
    const homeFromPvRatio = homeConsumption > 0 ? pvToHome / homeConsumption : 0;

    const donutsData = [
      { 
        id: "PV", 
        label: "Photovoltaïque", 
        totalKwh: pvPower, 
        ratio: pvToHomeRatio, 
        selfConsumptionRatio: pvPower > 0 ? (pvToHome / pvPower) * 100 : 0 
      },
      { 
        id: "MAISON", 
        label: "Maison", 
        totalKwh: homeConsumption, 
        ratio: homeFromPvRatio 
      },
      { 
        id: "GRID", 
        label: "", 
        totalKwh: gridPower, 
        ratio: 1, 
        importTotal: isGridImporting ? gridPower : 0, 
        exportTotal: isGridExporting ? gridPower : 0 
      }
    ];

    // Initialize energy flows
    const fluxData = [];
    
    // Add PV->home flow if there's production and consumption
    if (pvToHome > 0) {
      fluxData.push({ 
        source: "PV", 
        target: "MAISON", 
        kwh: pvToHome,
        title: "Autoconsommation"
      });
    }
    
    // Add grid->home flow when importing from grid
    if (gridToHome > 0) {
      fluxData.push({ 
        source: "GRID", 
        target: "MAISON", 
        kwh: gridToHome,
        title: "Réseau"
      });
    }
    
    // Add PV->grid flow when exporting to grid
    if (pvToGrid > 0) {
      fluxData.push({ 
        source: "PV", 
        target: "GRID", 
        kwh: pvToGrid,
        title: "Injection"
      });
    }

    // Clean up existing SVG
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Set dimensions - match the daily view size
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

    // Define center positions - match the daily view layout
    const centers = {
      PV:     { x: svgWidth / 2,        y: 120 },
      GRID:   { x: svgWidth / 2 - 240,  y: 380 },
      MAISON: { x: svgWidth / 2 + 240,  y: 380 }
    };

    // Define donut dimensions
    const outerRadius = 60;
    const thickness = 12;

    // Use the functions from d3DailyEnergyFlowUtils
    // but with our realtime data
    const { createFluxPaths, createDonutCharts } = require('@/lib/d3DailyEnergyFlowUtils');

    // Create flux paths between nodes
    createFluxPaths(svg, fluxData, centers, outerRadius);

    // Create donut charts for real-time view (false for realtime - shows watts instead of kWh)
    createDonutCharts(svg, donutsData, centers, outerRadius, thickness, false);

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
