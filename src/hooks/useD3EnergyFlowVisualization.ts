
import { useEffect, RefObject, Dispatch, SetStateAction } from 'react';
import * as d3 from 'd3';
import { DailyTotals } from './useDailyEnergyTotals';
import { createFluxPaths, createDonutCharts } from '@/lib/d3EnergyFlowUtils';

interface UseD3EnergyFlowVisualizationProps {
  svgRef: RefObject<SVGSVGElement>;
  dailyTotals: DailyTotals;
  loading: boolean;
  isClient: boolean;
  setIsClient: Dispatch<SetStateAction<boolean>>;
}

export function useD3EnergyFlowVisualization({
  svgRef,
  dailyTotals,
  loading,
  isClient,
  setIsClient
}: UseD3EnergyFlowVisualizationProps) {
  // Set isClient to true on client side
  useEffect(() => {
    setIsClient(true);
  }, [setIsClient]);

  // Main D3 visualization effect
  useEffect(() => {
    if (!isClient || !svgRef.current) return;

    // Only clear SVG if loading is complete to prevent flickering during data updates
    if (loading) {
      return;
    }

    // Cleanup function to remove all SVG elements and React components
    const cleanup = () => {
      if (svgRef.current) {
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
      }
    };

    // Préparer les données pour les donuts - convertir Wh en kWh
    const pvTotal = dailyTotals.production / 1000;
    const gridImportTotal = dailyTotals.importFromGrid / 1000;
    const gridExportTotal = dailyTotals.injection / 1000;
    const consumptionTotal = dailyTotals.consumption / 1000;
    
    // Calculate actual PV power used by home (total PV production minus what was exported)
    const pvToHome = Math.max(0, pvTotal - gridExportTotal);
    
    // Calculate self-consumption ratio (percentage of PV production consumed directly)
    const selfConsumptionRatio = pvTotal > 0 ? (pvToHome / pvTotal) * 100 : 0;
    
    // Calculate ratios for donut charts
    const pvToHomeRatio = pvTotal > 0 ? pvToHome / pvTotal : 0;
    const homeFromPvRatio = consumptionTotal > 0 ? pvToHome / consumptionTotal : 0;
    const gridTotalFlux = gridImportTotal + gridExportTotal;

    const donutsData = [
      { id: "PV", label: "Photovoltaïque", totalKwh: pvTotal, ratio: pvToHomeRatio, selfConsumptionRatio },
      { id: "MAISON", label: "Maison", totalKwh: consumptionTotal, ratio: homeFromPvRatio },
      { id: "GRID", label: "", totalKwh: gridTotalFlux, ratio: 1, importTotal: gridImportTotal, exportTotal: gridExportTotal }
    ];

    // Initialize with PV to home flow which always exists if PV is producing
    const fluxData = [];
    
    // Only add PV->home flow if there's actual production being used by home
    if (pvToHome > 0) {
      fluxData.push({ 
        source: "PV", 
        target: "MAISON", 
        kwh: pvToHome,
        title: "Autoconsommation" // Added title as requested
      });
    }
    
    // Only add grid->home flow when there's actual import from grid
    if (gridImportTotal > 0) {
      fluxData.push({ 
        source: "GRID", 
        target: "MAISON", 
        kwh: gridImportTotal,
        title: "Réseau" // Added title as requested
      });
    }
    
    // Only add PV->grid flow when there's actual export from PV to grid
    if (gridExportTotal > 0) {
      fluxData.push({ 
        source: "PV", 
        target: "GRID", 
        kwh: gridExportTotal,
        title: "Injection" // Added title as requested
      });
    }

    // Nettoyer le SVG existant
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

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

    // Définir les positions des centres avec plus d'écart
    const centers = {
      PV:     { x: svgWidth / 2,        y: 120 },
      GRID:   { x: svgWidth / 2 - 240,  y: 380 }, // Écarté à gauche
      MAISON: { x: svgWidth / 2 + 240,  y: 380 }  // Écarté à droite
    };

    // Définir les dimensions des donuts
    const outerRadius = 60;
    const thickness = 12;

    // Create flux paths between nodes
    const fluxPaths = createFluxPaths(svg, fluxData, centers, outerRadius);

    // Create donut charts with icons on top - pass selfConsumptionRatio for display
    createDonutCharts(svg, donutsData, centers, outerRadius, thickness, true); // true for daily view (show kWh)

    // Ajouter un titre
    svg.append("text")
      .attr("x", svgWidth / 2)
      .attr("y", 40)
      .attr("text-anchor", "middle")
      .attr("font-size", 18)
      .attr("font-weight", "bold")
      .attr("fill", "#555")
      .text("Bilan Énergétique Journalier");

    // We don't return cleanup here to prevent the chart from disappearing during data updates
  }, [dailyTotals, isClient, svgRef]);
}
