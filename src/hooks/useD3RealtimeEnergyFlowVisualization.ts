
import { useEffect, RefObject, Dispatch, SetStateAction } from 'react';
import * as d3 from 'd3';
import { ShellyEMData } from '@/lib/types';
import ReactDOM from 'react-dom';
import React from 'react';
import { HousePlug, Sun, Zap, ArrowRight, ArrowLeft } from 'lucide-react';

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

    const pvPower = data.pv_power / 1000;
    const gridPower = Math.abs(data.power) / 1000;
    const homeConsumption = (data.pv_power + Math.max(0, data.power)) / 1000;

    const isPVProducing = data.pv_power > 6;
    const isGridImporting = data.power > 0;
    const isGridExporting = data.power < 0;

    const pvToHome = isPVProducing ? Math.min(pvPower, pvPower + (isGridExporting ? gridPower : 0)) : 0;
    const pvToGrid = isPVProducing && isGridExporting ? Math.abs(Math.max(0, pvPower - homeConsumption)) : 0;
    const gridToHome = isGridImporting ? gridPower : 0;

    const pvToHomeRatio = pvPower > 0 ? pvToHome / pvPower : 0;
    const homeFromPvRatio = homeConsumption > 0 ? pvToHome / homeConsumption : 0;

    const donutsData = [
      { 
        id: "PV", 
        label: "", 
        totalKwh: pvPower, 
        ratio: pvToHomeRatio, 
        selfConsumptionRatio: pvPower > 0 ? (pvToHome / pvPower) * 100 : 0,
        powerValue: `${data.pv_power.toFixed(0)} W`
      },
      { 
        id: "MAISON", 
        label: "", 
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

    const fluxData = [];

    if (pvToHome > 0) {
      fluxData.push({ 
        source: "PV", 
        target: "MAISON", 
        kwh: pvToHome,
        title: "Autoconsommation"
      });
    }

    if (gridToHome > 0) {
      fluxData.push({ 
        source: "GRID", 
        target: "MAISON", 
        kwh: gridToHome,
        title: "Réseau"
      });
    }

    if (pvToGrid > 0) {
      fluxData.push({ 
        source: "PV", 
        target: "GRID", 
        kwh: pvToGrid,
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
  }, [data, isClient, svgRef]);
}

function createFluxPaths(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  fluxData: any[],
  centers: Record<string, { x: number; y: number }>,
  nodeRadius: number
) {
  const powerValues = fluxData.map(f => f.kwh);
  const maxPower = Math.max(...powerValues, 0.1);
  
  const strokeScale = d3.scaleLinear()
    .domain([0, maxPower])
    .range([2, 10]);

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

  // Create temporary text elements to measure their dimensions
  const tempText = svg.selectAll(".temp-text")
    .data(fluxData)
    .enter()
    .append("text")
    .attr("class", "temp-text")
    .style("visibility", "hidden")
    .text(d => d.title);

  // Calculate background rectangles with dynamic sizing
  const labelBackgrounds = svg.selectAll(".flux-label-bg")
    .data(fluxData)
    .enter()
    .append("rect")
    .attr("class", "flux-label-bg")
    .attr("rx", 8)
    .attr("ry", 8)
    .attr("fill", "white")
    .attr("opacity", 0.8)
    .attr("stroke", d => {
      if (d.source === "PV") return "#66BB6A";
      if (d.source === "GRID") return "#42A5F5";
      return "#888";
    })
    .attr("stroke-width", 1)
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
      
      // Get corresponding text element and compute its dimensions
      const textNode = tempText.filter((td: any) => td.title === d.title).node();
      // Add padding
      const padding = { x: 10, y: 6 };
      const textWidth = textNode ? textNode.getBBox().width + (padding.x * 2) : 80;
      const textHeight = textNode ? textNode.getBBox().height + (padding.y * 2) : 22;
      
      return `translate(${mx - textWidth/2}, ${my - textHeight/2})`;
    })
    .attr("width", function() {
      const textNode = tempText.filter((td: any, i: number) => i === this.parentNode.__data__.index).node();
      return textNode ? textNode.getBBox().width + 20 : 80; // Adding padding
    })
    .attr("height", function() {
      const textNode = tempText.filter((td: any, i: number) => i === this.parentNode.__data__.index).node();
      return textNode ? textNode.getBBox().height + 12 : 22; // Adding padding
    });

  // Remove temporary text elements
  tempText.remove();

  svg.selectAll(".flux-label")
    .data(fluxData)
    .enter()
    .append("text")
    .attr("class", "flux-label")
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "central") // This centers text vertically
    .attr("fill", d => {
      if (d.source === "PV") return "#66BB6A";
      if (d.source === "GRID") return "#42A5F5";
      return "#888";
    })
    .attr("font-size", "12px")
    .style("pointer-events", "none")
    .text(d => d.title)
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
      d3.select(this).call(function(selection) {
        if (!selection.empty()) {
          animateFlux(selection);
        }
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
  thickness: number
) {
  donutsData.forEach(d => {
    const center = centers[d.id];
    const g = svg.append("g")
      .attr("transform", `translate(${center.x}, ${center.y})`);
    
    g.append("circle")
      .attr("r", outerRadius - thickness / 2)
      .attr("fill", "white")
      .attr("stroke", "#e2e8f0")
      .attr("stroke-width", thickness);
    
    let color;
    let textColor;
    
    if (d.id === "PV") {
      color = "#66BB6A";
      textColor = "#4CAF50";
    } else if (d.id === "GRID") {
      color = "#42A5F5";
      textColor = "#2196F3";
    } else {
      color = "#F97316";
      textColor = "#EA580C";
    }
    
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
    
    const iconY = -40;
    
    const foreignObject = g.append("foreignObject")
      .attr("width", 28)
      .attr("height", 28)
      .attr("x", -14)
      .attr("y", iconY);
    
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.justifyContent = 'center';
    container.style.alignItems = 'center';
    container.style.width = '100%';
    container.style.height = '100%';
    
    foreignObject.node()?.appendChild(container);
    
    if (d.id === "PV") {
      ReactDOM.render(
        React.createElement(Sun, { size: 24, color: textColor, strokeWidth: 2 }),
        container
      );
    } else if (d.id === "MAISON") {
      ReactDOM.render(
        React.createElement(HousePlug, { size: 24, color: textColor, strokeWidth: 2 }),
        container
      );
    } else if (d.id === "GRID") {
      ReactDOM.render(
        React.createElement(Zap, { size: 24, color: textColor, strokeWidth: 2 }),
        container
      );
    }
    
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("y", 20)
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .attr("fill", textColor)
      .text(d.powerValue);
      
    if (d.id === "GRID" && d.importTotal !== undefined && d.exportTotal !== undefined) {
      if (d.importTotal > 0) {
        const importForeignObject = g.append("foreignObject")
          .attr("width", 16)
          .attr("height", 16)
          .attr("x", -36)
          .attr("y", -5);
        
        const importContainer = document.createElement('div');
        importContainer.style.display = 'flex';
        importContainer.style.justifyContent = 'center';
        importContainer.style.alignItems = 'center';
        importContainer.style.width = '100%';
        importContainer.style.height = '100%';
        
        importForeignObject.node()?.appendChild(importContainer);
        
        ReactDOM.render(
          React.createElement(ArrowRight, { size: 16, color: textColor, strokeWidth: 2 }),
          importContainer
        );
      }
      
      if (d.exportTotal > 0) {
        const exportForeignObject = g.append("foreignObject")
          .attr("width", 16)
          .attr("height", 16)
          .attr("x", -36)
          .attr("y", 15);
        
        const exportContainer = document.createElement('div');
        exportContainer.style.display = 'flex';
        exportContainer.style.justifyContent = 'center';
        exportContainer.style.alignItems = 'center';
        exportContainer.style.width = '100%';
        exportContainer.style.height = '100%';
        
        exportForeignObject.node()?.appendChild(exportContainer);
        
        ReactDOM.render(
          React.createElement(ArrowLeft, { size: 16, color: "#388E3C", strokeWidth: 2 }),
          exportContainer
        );
      }
    }
  });
}
