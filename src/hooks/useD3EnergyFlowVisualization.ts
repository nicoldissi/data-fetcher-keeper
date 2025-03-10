
import { useEffect, RefObject, Dispatch, SetStateAction } from 'react';
import * as d3 from 'd3';
import { DailyTotals } from './useDailyEnergyTotals';
import { createFluxPaths, createDonutCharts, createPowerGauges } from '@/lib/d3EnergyFlowUtils';

interface DataSource {
  type: 'daily' | 'realtime';
  data: DailyTotals;
}

interface UseD3EnergyFlowVisualizationProps {
  svgRef: RefObject<SVGSVGElement>;
  dataSource: DataSource;
  loading: boolean;
  isClient: boolean;
  setIsClient: Dispatch<SetStateAction<boolean>>;
  showWatts?: boolean;
}

export function useD3EnergyFlowVisualization({
  svgRef,
  dataSource,
  loading,
  isClient,
  setIsClient,
  showWatts = false
}: UseD3EnergyFlowVisualizationProps) {
  // Set isClient to true on client side
  useEffect(() => {
    setIsClient(true);
  }, [setIsClient]);

  // Main D3 visualization effect
  useEffect(() => {
    if (!isClient || loading || !svgRef.current) return;

    // Cleanup function to remove all SVG elements and React components
    const cleanup = () => {
      if (svgRef.current) {
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
      }
    };

    // Get data based on the source type
    const data = dataSource.data;
    const isRealtime = dataSource.type === 'realtime';
    
    if (isRealtime && showWatts) {
      // For realtime power in Watts, use createPowerGauges
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      // Apply dimensions
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

      // Define the positions of centers with more spacing
      const centers = {
        PV:     { x: svgWidth / 2,        y: 120 },
        RESEAU: { x: svgWidth / 2 - 240,  y: 380 },
        MAISON: { x: svgWidth / 2 + 240,  y: 380 }
      };

      // Create power gauges with the appropriate scales
      createPowerGauges(svg, data, centers);

      // Create flux paths between nodes based on the real-time power flows
      const fluxData = [];
      
      // Only add PV->home flow if there's actual production being used by home
      if (data.selfConsumption > 0) {
        fluxData.push({ source: "PV", target: "MAISON", power: data.selfConsumption });
      }
      
      // Only add grid->home flow when there's actual import from grid
      if (data.importFromGrid > 0) {
        fluxData.push({ source: "RESEAU", target: "MAISON", power: data.importFromGrid });
      }
      
      // Only add PV->grid flow when there's actual export from PV to grid
      if (data.injection > 0) {
        fluxData.push({ source: "PV", target: "RESEAU", power: data.injection });
      }

      // Create the flux paths
      createFluxPaths(svg, fluxData, centers, 60, true);

      // Add a title
      svg.append("text")
        .attr("x", svgWidth / 2)
        .attr("y", 40)
        .attr("text-anchor", "middle")
        .attr("font-size", 18)
        .attr("font-weight", "bold")
        .attr("fill", "#555")
        .text("Flux d'énergie en Watts");
    } else {
      // For daily energy in kWh, use the original approach with donut charts
      // Prepare data for donuts - convert Wh to kWh
      const pvTotal = data.production / 1000;
      const gridImportTotal = data.importFromGrid / 1000;
      const gridExportTotal = data.injection / 1000;
      const consumptionTotal = data.consumption / 1000;
      
      // Calculate actual PV power used by home (total PV production minus what was exported)
      const pvToHome = Math.max(0, pvTotal - gridExportTotal);
      
      // Calculate ratios for donut charts
      const pvToHomeRatio = pvTotal > 0 ? pvToHome / pvTotal : 0;
      const homeFromPvRatio = consumptionTotal > 0 ? pvToHome / consumptionTotal : 0;
      const gridTotalFlux = gridImportTotal + gridExportTotal;

      const donutsData = [
        { id: "PV", label: "Photovoltaïque", totalKwh: pvTotal, ratio: pvToHomeRatio },
        { id: "MAISON", label: "Maison", totalKwh: consumptionTotal, ratio: homeFromPvRatio },
        { id: "RESEAU", label: "Réseau", totalKwh: gridTotalFlux, ratio: 1, importTotal: gridImportTotal, exportTotal: gridExportTotal }
      ];

      // Initialize with PV to home flow which always exists if PV is producing
      const fluxData = [];
      
      // Only add PV->home flow if there's actual production being used by home
      if (pvToHome > 0) {
        fluxData.push({ source: "PV", target: "MAISON", kwh: pvToHome });
      }
      
      // Only add grid->home flow when there's actual import from grid
      if (gridImportTotal > 0) {
        fluxData.push({ source: "RESEAU", target: "MAISON", kwh: gridImportTotal });
      }
      
      // Only add PV->grid flow when there's actual export from PV to grid
      if (gridExportTotal > 0) {
        fluxData.push({ source: "PV", target: "RESEAU", kwh: gridExportTotal });
      }

      // Clear the SVG
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      // Apply dimensions
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

      // Define the positions of centers with more spacing
      const centers = {
        PV:     { x: svgWidth / 2,        y: 120 },
        RESEAU: { x: svgWidth / 2 - 240,  y: 380 },
        MAISON: { x: svgWidth / 2 + 240,  y: 380 }
      };

      // Define the dimensions of the donuts
      const outerRadius = 60;
      const thickness = 12;

      // Create flux paths between nodes
      createFluxPaths(svg, fluxData, centers, outerRadius, false);

      // Create donut charts with icons on top
      createDonutCharts(svg, donutsData, centers, outerRadius, thickness);

      // Add a title
      svg.append("text")
        .attr("x", svgWidth / 2)
        .attr("y", 40)
        .attr("text-anchor", "middle")
        .attr("font-size", 18)
        .attr("font-weight", "bold")
        .attr("fill", "#555")
        .text("Bilan Énergétique");
    }

    // Return cleanup function to prevent memory leaks
    return cleanup;
  }, [dataSource, loading, isClient, svgRef, showWatts]);
}
