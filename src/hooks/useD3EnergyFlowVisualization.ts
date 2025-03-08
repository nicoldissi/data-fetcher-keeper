
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
    if (!isClient || loading || !svgRef.current) return;

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
    
    const pvToHome = pvTotal - gridExportTotal;
    const pvToHomeRatio = pvTotal > 0 ? pvToHome / pvTotal : 0;
    const homeFromPvRatio = consumptionTotal > 0 ? pvToHome / consumptionTotal : 0;
    const gridTotalFlux = gridImportTotal + gridExportTotal;

    const donutsData = [
      { id: "PV", label: "Photovoltaïque", totalKwh: pvTotal, ratio: pvToHomeRatio },
      { id: "MAISON", label: "Maison", totalKwh: consumptionTotal, ratio: homeFromPvRatio },
      { id: "RESEAU", label: "Réseau", totalKwh: gridTotalFlux, ratio: 1, importTotal: gridImportTotal, exportTotal: gridExportTotal }
    ];

    const fluxData = [
      { source: "PV", target: "MAISON", kwh: pvToHome },
      { source: "PV", target: "RESEAU", kwh: gridExportTotal },
      { source: "RESEAU", target: "MAISON", kwh: gridImportTotal }
    ];

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
      RESEAU: { x: svgWidth / 2 - 240,  y: 380 }, // Écarté encore plus à gauche (était -220)
      MAISON: { x: svgWidth / 2 + 240,  y: 380 }  // Écarté encore plus à droite (était +220)
    };

    // Définir les dimensions des donuts
    const outerRadius = 60;
    const thickness = 12;

    // Create flux paths between nodes
    const fluxPaths = createFluxPaths(svg, fluxData, centers, outerRadius);

    // Create donut charts with icons on top
    createDonutCharts(svg, donutsData, centers, outerRadius, thickness);

    // Ajouter un titre
    svg.append("text")
      .attr("x", svgWidth / 2)
      .attr("y", 40)
      .attr("text-anchor", "middle")
      .attr("font-size", 18)
      .attr("font-weight", "bold")
      .attr("fill", "#555")
      .text("Bilan Énergétique Journalier");

    // Return cleanup function to prevent memory leaks
    return cleanup;
  }, [dailyTotals, loading, isClient, svgRef]);
}
