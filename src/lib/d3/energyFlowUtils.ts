import * as d3 from 'd3';
import { HousePlug, Sun, Zap, ArrowRight, ArrowLeft } from 'lucide-react';
import React from 'react';
import { createRoot } from 'react-dom/client';

export interface Center {
  x: number;
  y: number;
}

export interface FluxData {
  source: string;
  target: string;
  kwh: number;
  title?: string; // Title property for flow labels
}

export interface DonutData {
  id: string;
  label: string;
  totalKwh: number;
  ratio: number;
  importTotal?: number;
  exportTotal?: number;
  selfConsumptionRatio?: number;
  color?: string;
  textColor?: string;
  powerValue?: string;
  maxValue?: string;
  pvPower?: number;
  gridPower?: number;
  pvRatio?: number;
  gridRatio?: number;
  importRatio?: number;
  exportRatio?: number;
  isExporting?: boolean;
  isImporting?: boolean;
  homeConsumption?: number;
}

export function createFluxPaths(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  fluxData: FluxData[],
  centers: Record<string, Center>,
  outerRadius: number
) {
  const kwhValues = fluxData.map(f => f.kwh);
  const maxKwh = Math.max(...kwhValues);
  const minKwh = Math.min(...kwhValues);

  const strokeScale = d3.scaleLinear()
    .domain([Math.max(0.1, minKwh), Math.max(1, maxKwh)])
    .range([2, 8]);

  function getFluxColor(d: FluxData) {
    if(d.source === "PV") return "#66BB6A";
    if(d.source === "GRID") return "#42A5F5";
    return "#888";
  }

  const fluxPaths = svg.selectAll(".flux")
    .data(fluxData)
    .enter()
    .append("path")
    .attr("class", "flux")
    .attr("fill", "none")
    .attr("stroke", d => getFluxColor(d))
    .attr("stroke-width", d => strokeScale(Math.max(0.1, d.kwh)))
    .attr("stroke-linecap", "round")
    .attr("stroke-dasharray", "8 8")
    .attr("filter", "url(#glow)")
    .attr("d", (d: FluxData) => {
      const s = centers[d.source as keyof typeof centers];
      const t = centers[d.target as keyof typeof centers];
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const offset = outerRadius + 5;
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

  function animateFlux() {
    fluxPaths
      .transition()
      .duration(1500)
      .ease(d3.easeLinear)
      .attrTween("stroke-dashoffset", () => d3.interpolate(0, -16) as any)
      .on("end", animateFlux);
  }
  animateFlux();

  function getBorderColor(d: FluxData) {
    if(d.source === "PV") return "#4CAF50";
    if(d.source === "GRID") return "#2196F3";
    return "#888";
  }

  function getTextColor(d: FluxData) {
    if(d.source === "PV") return "#4CAF50";
    if(d.source === "GRID") return "#2196F3";
    return "#555";
  }

  svg.selectAll(".flux-label-container")
    .data(fluxData)
    .enter()
    .append("g")
    .attr("class", "flux-label-container")
    .each(function(d: FluxData) {
      const s = centers[d.source as keyof typeof centers];
      const t = centers[d.target as keyof typeof centers];
      
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const offset = outerRadius + 5;
      const ratioStart = offset / dist;
      const x1 = s.x + dx * ratioStart;
      const y1 = s.y + dy * ratioStart;
      const ratioEnd = (dist - offset) / dist;
      const x2 = s.x + dx * ratioEnd;
      const y2 = s.y + dy * ratioEnd;
      
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2 - 40;
      
      const tParam = 0.5;
      const bezierX = (1-tParam)*(1-tParam)*x1 + 2*(1-tParam)*tParam*mx + tParam*tParam*x2;
      const bezierY = (1-tParam)*(1-tParam)*y1 + 2*(1-tParam)*tParam*my + tParam*tParam*y2;

      const borderColor = getBorderColor(d);
      const textColor = getTextColor(d);

      // Get the title based on flow type
      const title = d.title || getFlowTitle(d);
            const valueText = ``;
            
            // Calculate responsive width based on text content
            const titleLength = title.length;
      const valueLength = valueText.length;
      const maxLength = Math.max(titleLength, valueLength);
      const labelWidth = Math.max(80, maxLength * 7); // 7px per character with minimum of 80px
      
      // Create a rectangle with rounded corners for the label background with responsive width
      d3.select(this)
        .append("rect")
        .attr("x", bezierX - labelWidth/2)
        .attr("y", bezierY - 25) 
        .attr("width", labelWidth)
        .attr("height", 40) // Increased height for better spacing
        .attr("rx", 12)
        .attr("ry", 12)
        .attr("fill", "white")
        .attr("stroke", borderColor)
        .attr("stroke-width", 1)
        .attr("fill-opacity", 0.9)
        .attr("filter", "drop-shadow(0px 1px 2px rgba(0,0,0,0.1))");

      // Add the title inside the bubble (first line)
      d3.select(this)
        .append("text")
        .attr("x", bezierX)
        .attr("y", bezierY - 8) 
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", 12)
        .attr("font-weight", "medium")
        .attr("fill", textColor)
        .text(title);

      // Add the value as second line
      d3.select(this)
        .append("text")
        .attr("x", bezierX)
        .attr("y", bezierY + 10) // Slight adjustment to better center vertically
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", 13) // Slightly larger for better readability
        .attr("font-weight", "bold") // Made the values bold
        .attr("fill", textColor)
        .text(valueText);
    });

  return fluxPaths;
}

function getFlowTitle(d: FluxData) {
  if (d.source === "PV" && d.target === "MAISON") {
    return "Autoconsommation";
  } else if (d.source === "PV" && d.target === "GRID") {
    return "Injection";
  } else if (d.source === "GRID" && d.target === "MAISON") {
    return "Réseau";
  }
  return "";
}
