import { useEffect, RefObject, Dispatch, SetStateAction, useRef } from 'react';
import * as d3 from 'd3';
import { DailyTotals } from './useDailyEnergyTotals';
import { createFluxPaths, createDonutCharts } from '@/lib/d3EnergyFlowUtils';
import { ShellyConfig } from '@/lib/types';

// Define a common power data interface that works for both daily and realtime
export interface PowerData {
  production: number;
  consumption: number;
  injection: number;
  importFromGrid: number;
  batteryCharge?: number;
  batteryDischarge?: number;
  selfConsumption?: number;
  selfConsumptionRatio?: number; // Nouveau champ pour le ratio
}

interface UseD3EnergyFlowVisualizationProps {
  svgRef: RefObject<SVGSVGElement>;
  powerData: PowerData;
  loading: boolean;
  isClient: boolean;
  setIsClient: Dispatch<SetStateAction<boolean>>;
  maxValues?: {
    inverterPowerW?: number;
    gridSubscriptionW?: number;
  };
  mode?: 'daily' | 'realtime'; // Nouvelle prop pour différencier les modes
}

export function useD3EnergyFlowVisualization({
  svgRef,
  powerData,
  loading,
  isClient,
  setIsClient,
  maxValues,
  mode
}: UseD3EnergyFlowVisualizationProps) {
  // Store previous data for smoother transitions
  const prevDataRef = useRef<PowerData>(powerData);
  
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
        // Do not remove all elements, just update them
        // svg.selectAll("*").remove();
      }
    };

    // Convert values from Wh to W for daily totals or use W directly for realtime
    const pvTotal = powerData.production;
    const gridImportTotal = powerData.importFromGrid;
    const gridExportTotal = powerData.injection;
    const consumptionTotal = powerData.consumption;
    
    // Calculate actual PV power used by home (total PV production minus what was exported)
    const pvToHome = Math.max(0, pvTotal - gridExportTotal);
    
    // Calculate ratios for donut charts - we no longer use ratios for gauges
    const pvToHomeRatio = pvTotal > 0 ? pvToHome / pvTotal : 0;
    const homeFromPvRatio = consumptionTotal > 0 ? pvToHome / consumptionTotal : 0;
    const gridTotalFlux = gridImportTotal + gridExportTotal;

    // Use provided max values or defaults
    const inverterPowerW = maxValues?.inverterPowerW || 3000; // Default 3kW
    const gridSubscriptionW = maxValues?.gridSubscriptionW || 6000; // Default 6kW

    const donutsData = [
      { 
        id: "PV", 
        label: "Photovoltaïque", 
        totalW: pvTotal, 
        maxW: inverterPowerW,
        ratio: pvToHomeRatio,
        selfConsumptionRatio: powerData.selfConsumptionRatio
      },
      { 
        id: "MAISON", 
        label: "Maison", 
        totalW: consumptionTotal, 
        maxW: Math.max(consumptionTotal, 3000), // Ensure there's always a reasonable max
        ratio: homeFromPvRatio 
      },
      { 
        id: "RESEAU", 
        label: "Réseau", 
        totalW: gridTotalFlux, 
        maxW: gridSubscriptionW,
        ratio: 1, 
        importTotal: gridImportTotal, 
        exportTotal: gridExportTotal 
      }
    ];

    // Initialize with PV to home flow which always exists if PV is producing
    const fluxData = [];
    
    // Only add PV->home flow if there's actual production being used by home
    if (pvToHome > 0) {
      fluxData.push({ source: "PV", target: "MAISON", w: pvToHome });
    }
    
    // Only add grid->home flow when there's actual import from grid
    if (gridImportTotal > 0) {
      fluxData.push({ source: "RESEAU", target: "MAISON", w: gridImportTotal });
    }
    
    // Only add PV->grid flow when there's actual export from PV to grid
    if (gridExportTotal > 0) {
      fluxData.push({ source: "PV", target: "RESEAU", w: gridExportTotal });
    }

    // Get the SVG element
    const svg = d3.select(svgRef.current);

    // Initialize SVG if it's empty
    if (svg.select("defs").empty()) {
      // Appliquer les dimensions
      const svgWidth = 700;
      const svgHeight = 500;
      svg.attr("width", svgWidth)
         .attr("height", svgHeight)
         .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
         .attr("preserveAspectRatio", "xMidYMid meet");

      // Créer les définitions pour les effets
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

      // Ajouter un titre
      svg.append("text")
        .attr("x", svgWidth / 2)
        .attr("y", 40)
        .attr("text-anchor", "middle")
        .attr("font-size", 18)
        .attr("font-weight", "bold")
        .attr("fill", "#555")
        .text("Bilan Énergétique");
    }

    // Définir les positions des centres avec plus d'écart
    const centers = {
      PV:     { x: 700 / 2,        y: 120 },
      RESEAU: { x: 700 / 2 - 240,  y: 380 }, // Écarté à gauche
      MAISON: { x: 700 / 2 + 240,  y: 380 }  // Écarté à droite
    };

    // Définir les dimensions des donuts
    const outerRadius = 60;
    const thickness = 12;

    // Create or update flux paths between nodes
    createFluxPaths(svg, fluxData, centers, outerRadius);

    // Create or update donut charts with icons on top
    createDonutCharts(svg, donutsData, centers, outerRadius, thickness, prevDataRef, mode);

    // Update the previous data reference for next render
    prevDataRef.current = powerData;

    // Return cleanup function to prevent memory leaks
    return cleanup;
  }, [powerData, loading, isClient, svgRef, maxValues, mode]);
}
