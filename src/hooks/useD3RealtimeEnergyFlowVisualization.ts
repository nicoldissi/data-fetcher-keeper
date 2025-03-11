
import { useEffect, RefObject, Dispatch, SetStateAction } from 'react';
import * as d3 from 'd3';
import { ShellyEMData } from '@/lib/types';

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

    // Cleanup function to remove all SVG elements
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
        selfConsumptionRatio: pvPower > 0 ? (pvToHome / pvPower) * 100 : 0,
        powerValue: `${data.pv_power.toFixed(0)} W`
      },
      { 
        id: "MAISON", 
        label: "Maison", 
        totalKwh: homeConsumption, 
        ratio: homeFromPvRatio,
        powerValue: `${(data.pv_power + Math.max(0, data.power)).toFixed(0)} W`
      },
      { 
        id: "GRID", 
        label: "", 
        totalKwh: gridPower, 
        ratio: 1, 
        importTotal: isGridImporting ? gridPower : 0, 
        exportTotal: isGridExporting ? gridPower : 0,
        powerValue: `${Math.abs(data.power).toFixed(0)} W`
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
      MAISON: { x: svgWidth / 2 + 240,  y: 380 }
    };

    // Define donut dimensions
    const outerRadius = 60;
    const thickness = 12;

    // Create flux paths
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

// Helper functions for creating visual elements

function createFluxPaths(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  fluxData: any[],
  centers: Record<string, { x: number; y: number }>,
  nodeRadius: number
) {
  // Scale stroke width based on energy flow
  const powerValues = fluxData.map(f => f.kwh);
  const maxPower = Math.max(...powerValues, 0.1);
  
  const strokeScale = d3.scaleLinear()
    .domain([0, maxPower])
    .range([2, 10]);

  // Create paths
  const fluxPaths = svg.selectAll(".flux")
    .data(fluxData)
    .enter()
    .append("path")
    .attr("class", "flux")
    .attr("fill", "none")
    .attr("stroke", d => {
      if (d.source === "PV") return "#66BB6A";
      if (d.source === "GRID") return "#42A5F5";
      return "#888";
    })
    .attr("stroke-width", d => strokeScale(d.kwh))
    .attr("stroke-linecap", "round")
    .attr("stroke-dasharray", "8 8")
    .attr("filter", "url(#glow)")
    .attr("d", (d: any) => {
      const s = centers[d.source];
      const t = centers[d.target];
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const offset = nodeRadius + 5;
      const ratioStart = offset / dist;
      const x1 = s.x + dx * ratioStart;
      const y1 = s.y + dy * ratioStart;
      const ratioEnd = (dist - offset) / dist;
      const x2 = s.x + dx * ratioEnd;
      const y2 = s.y + dy * ratioEnd;
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2 - 40;
      return `M ${x1},${y1} Q ${mx},${my} ${x2},${y2}`;
    });

  // Add title labels to the flux paths (without values)
  svg.selectAll(".flux-label")
    .data(fluxData)
    .enter()
    .append("text")
    .attr("class", "flux-label")
    .attr("text-anchor", "middle")
    .attr("dy", "-5px")
    .attr("fill", d => {
      if (d.source === "PV") return "#66BB6A";
      if (d.source === "GRID") return "#42A5F5";
      return "#888";
    })
    .attr("font-size", "12px")
    .attr("font-weight", "bold")
    .style("pointer-events", "none")
    .attr("filter", "url(#glow)")
    .text(d => d.title) // Only show title, no values
    .attr("transform", (d: any) => {
      const s = centers[d.source];
      const t = centers[d.target];
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const offset = nodeRadius + 5;
      const ratioStart = offset / dist;
      const x1 = s.x + dx * ratioStart;
      const y1 = s.y + dy * ratioStart;
      const ratioEnd = (dist - offset) / dist;
      const x2 = s.x + dx * ratioEnd;
      const y2 = s.y + dy * ratioEnd;
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2 - 40;
      return `translate(${mx}, ${my})`;
    });

  // Animate the dashed lines
  fluxPaths
    .transition()
    .duration(1500)
    .ease(d3.easeLinear)
    .attrTween("stroke-dashoffset", function() {
      return function(t: number) {
        return `${0 - 16 * t}`;
      };
    })
    .on("end", function() {
      // Restart animation
      d3.select(this)
        .transition()
        .duration(1500)
        .ease(d3.easeLinear)
        .attrTween("stroke-dashoffset", function() {
          return function(t: number) {
            return `${0 - 16 * t}`;
          };
        })
        .on("end", function() {
          d3.select(this).call(function(selection) {
            if (!selection.empty()) {
              animateFlux(selection);
            }
          });
        });
    });

  function animateFlux(selection: d3.Selection<d3.BaseType, unknown, null, undefined>) {
    selection
      .transition()
      .duration(1500)
      .ease(d3.easeLinear)
      .attrTween("stroke-dashoffset", function() {
        return function(t: number) {
          return `${0 - 16 * t}`;
        };
      })
      .on("end", function() {
        d3.select(this).call(animateFlux);
      });
  }

  return fluxPaths;
}

function createDonutCharts(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  donutsData: any[],
  centers: Record<string, { x: number; y: number }>,
  outerRadius: number,
  thickness: number,
  isDaily: boolean
) {
  // Process each donut chart
  donutsData.forEach(d => {
    const center = centers[d.id];
    const g = svg.append("g")
      .attr("transform", `translate(${center.x}, ${center.y})`);
    
    // Create background circle
    g.append("circle")
      .attr("r", outerRadius - thickness / 2)
      .attr("fill", "white")
      .attr("stroke", "#e2e8f0")
      .attr("stroke-width", thickness);
    
    // Create nodes with colored borders based on type
    let color;
    let icon;
    
    if (d.id === "PV") {
      color = "#66BB6A"; // Green for solar
      icon = "☀️";
    } else if (d.id === "GRID") {
      color = "#42A5F5"; // Blue for grid
      icon = "⚡";
    } else {
      color = "#F97316"; // Orange for home
      icon = "🏠";
    }
    
    // Draw the colored arc for ratio visualization
    if (d.ratio > 0) {
      const arc = d3.arc()
        .innerRadius(outerRadius - thickness)
        .outerRadius(outerRadius)
        .startAngle(0)
        .endAngle(d.ratio * 2 * Math.PI);
      
      g.append("path")
        .attr("d", arc as any)
        .attr("fill", color);
    }
    
    // Add icon
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("y", -5)
      .attr("font-size", "20px")
      .text(icon);
    
    // Add label
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("y", 20)
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .text(d.label);
    
    // Add power value (in W for real-time view)
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("y", 40)
      .attr("font-size", "12px")
      .text(d.powerValue);
  });
}
