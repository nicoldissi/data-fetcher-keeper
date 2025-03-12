
import { useEffect, RefObject, Dispatch, SetStateAction } from 'react';
import * as d3 from 'd3';
import { ShellyEMData, ShellyConfig } from '@/lib/types';
import { createFluxPaths } from '@/lib/d3/energyFlowUtils';
import { createDonutCharts } from '@/lib/d3/donutChartUtils';

interface UseD3RealtimeEnergyFlowVisualizationProps {
  svgRef: RefObject<SVGSVGElement>;
  data: ShellyEMData | null;
  isClient: boolean;
  setIsClient: Dispatch<SetStateAction<boolean>>;
  config?: ShellyConfig | null;
}

export function useD3RealtimeEnergyFlowVisualization({
  svgRef,
  data,
  isClient,
  setIsClient,
  config
}: UseD3RealtimeEnergyFlowVisualizationProps) {
  useEffect(() => {
    setIsClient(true);
  }, [setIsClient]);

  useEffect(() => {
    if (!isClient || !svgRef.current || !data) return;

    const cleanup = () => {
      if (svgRef.current) {
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
      }
    };

    // Convert kVA to Watts (multiply by 1000)
    const inverterKVA = config?.inverter_power_kva !== undefined ? Number(config.inverter_power_kva) : 3.0;
    const gridKVA = config?.grid_subscription_kva !== undefined ? Number(config.grid_subscription_kva) : 6.0;
    
    const inverterMaxPower = inverterKVA * 1000;
    const gridMaxPower = gridKVA * 1000;

    const pvPower = data.pv_power;
    const gridPower = Math.abs(data.power);
    
    // Updated calculation for home consumption
    let realHomeConsumption;
    if (data.power < 0) {
      // If we're injecting power (negative grid power), consumption = PV - |grid power|
      realHomeConsumption = data.pv_power - Math.abs(data.power);
    } else {
      // If we're consuming from grid, consumption = grid power + PV
      realHomeConsumption = data.power + data.pv_power;
    }

    const pvRatio = Math.min(1, data.pv_power / inverterMaxPower);
    const homeRatio = Math.min(1, realHomeConsumption / gridMaxPower);

    const isPVProducing = data.pv_power > 6;
    const isGridImporting = data.power > 0;
    const isGridExporting = data.power < 0;

    // Update flux values based on the new calculation
    const pvToHome = isPVProducing ? Math.min(pvPower, realHomeConsumption) : 0;
    const pvToGrid = isPVProducing && isGridExporting ? Math.abs(data.power) : 0;
    const gridToHome = isGridImporting ? gridPower : 0;

    const pvToHomeRatio = realHomeConsumption > 0 ? pvToHome / realHomeConsumption : 0;
    const gridToHomeRatio = realHomeConsumption > 0 ? gridToHome / realHomeConsumption : 0;

    // Add these back to fix the TS errors
    const gridExportRatio = isGridExporting ? Math.min(1, Math.abs(data.power) / gridMaxPower) : 0;
    const gridImportRatio = isGridImporting ? Math.min(1, Math.abs(data.power) / gridMaxPower) : 0;

    const donutsData = [
      { 
        id: "PV", 
        label: "", 
        totalKwh: pvPower / 1000, 
        ratio: pvRatio, 
        selfConsumptionRatio: pvPower > 0 ? (pvToHome / pvPower) * 100 : 0,
        powerValue: `${data.pv_power.toFixed(0)}`,
                maxValue: `${inverterKVA.toFixed(1)}`,
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
        powerValue: `${realHomeConsumption.toFixed(0)}`,
                maxValue: `${gridKVA.toFixed(1)}`,
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
        powerValue: `${Math.abs(data.power).toFixed(0)}`,
                maxValue: `${gridKVA.toFixed(1)}`,
                color: "#42A5F5",
                textColor: "#2196F3"
              }
    ];

    const fluxData = [];

    if (pvToHome > 0) {
      fluxData.push({ 
        source: "PV", 
        target: "MAISON", 
        kwh: pvToHome / 1000,
        title: "Autoconsommation"
      });
    }

    if (gridToHome > 0) {
      fluxData.push({ 
        source: "GRID", 
        target: "MAISON", 
        kwh: gridToHome / 1000,
        title: "Réseau"
      });
    }

    if (pvToGrid > 0) {
      fluxData.push({ 
        source: "PV", 
        target: "GRID", 
        kwh: pvToGrid / 1000,
        title: "Injection"
      });
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const svgWidth = 700;
    const svgHeight = 500;
    svg.attr("width", svgWidth)
       .attr("height", svgHeight)
       .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
       .attr("preserveAspectRatio", "xMidYMid meet");

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

    const centers = {
      PV:     { x: svgWidth / 2,        y: 120 },
      GRID:   { x: svgWidth / 2 - 240,  y: 380 },
      MAISON: { x: svgWidth / 2 + 240,  y: 380 }
    };

    const outerRadius = 60;
    const thickness = 12;

    createFluxPaths(svg, fluxData, centers, outerRadius);
    createDonutCharts(svg, donutsData, centers, outerRadius, thickness);

    svg.append("text")
      .attr("x", svgWidth / 2)
      .attr("y", 40)
      .attr("text-anchor", "middle")
      .attr("font-size", 18)
      .attr("font-weight", "bold")
      .attr("fill", "#555")
      .text("Flux Énergétique en Temps Réel");

    return cleanup;
  }, [data, isClient, svgRef, config]);
}
