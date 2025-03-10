
import * as d3 from 'd3';
import { HousePlug, Sun, Zap, ArrowRight, ArrowLeft } from 'lucide-react';
import React from 'react';
import ReactDOM from 'react-dom';

interface Center {
  x: number;
  y: number;
}

interface FluxData {
  source: string;
  target: string;
  kwh: number;
}

interface DonutData {
  id: string;
  label: string;
  totalKwh: number;
  ratio: number;
  importTotal?: number;
  exportTotal?: number;
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
    if(d.source === "RESEAU") return "#42A5F5";
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
    if(d.source === "RESEAU") return "#2196F3";
    return "#888";
  }

  function getTextColor(d: FluxData) {
    if(d.source === "PV") return "#4CAF50";
    if(d.source === "RESEAU") return "#2196F3";
    return "#555";
  }

  // Calculate position exactly on the flow path for the labels
  svg.selectAll(".flux-label-container")
    .data(fluxData)
    .enter()
    .append("g")
    .attr("class", "flux-label-container")
    .each(function(d: FluxData) {
      const s = centers[d.source as keyof typeof centers];
      const t = centers[d.target as keyof typeof centers];
      
      // Use Bezier curve calculations to find the exact midpoint of the curve
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
      
      // Control point
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2 - 40;
      
      // Calculate point at t=0.5 on the Bezier curve for perfect centering
      const tParam = 0.5; // Renamed from 't' to avoid redeclaration
      const bezierX = (1-tParam)*(1-tParam)*x1 + 2*(1-tParam)*tParam*mx + tParam*tParam*x2;
      const bezierY = (1-tParam)*(1-tParam)*y1 + 2*(1-tParam)*tParam*my + tParam*tParam*y2;

      const borderColor = getBorderColor(d);
      const textColor = getTextColor(d);

      d3.select(this)
        .append("rect")
        .attr("x", bezierX - 40)
        .attr("y", bezierY - 15)
        .attr("width", 80)
        .attr("height", 24)
        .attr("rx", 12)
        .attr("ry", 12)
        .attr("fill", "white")
        .attr("stroke", borderColor)
        .attr("stroke-width", 1)
        .attr("fill-opacity", 0.9)
        .attr("filter", "drop-shadow(0px 1px 2px rgba(0,0,0,0.1))");

      d3.select(this)
        .append("text")
        .attr("x", bezierX)
        .attr("y", bezierY)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", 12)
        .attr("font-weight", "medium")
        .attr("fill", textColor)
        .text(`${d.kwh.toFixed(1)} kWh`);
    });

  return fluxPaths;
}

export function createDonutCharts(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  donutsData: DonutData[],
  centers: Record<string, Center>,
  outerRadius: number,
  thickness: number
) {
  const arcBg = d3.arc()
    .innerRadius(outerRadius - thickness)
    .outerRadius(outerRadius)
    .startAngle(0)
    .endAngle(2 * Math.PI);

  const arcValue = d3.arc()
    .innerRadius(outerRadius - thickness)
    .outerRadius(outerRadius)
    .startAngle(0);

  const donutGroup = svg.selectAll(".donut")
    .data(donutsData)
    .enter()
    .append("g")
    .attr("class", "donut")
    .attr("transform", (d: DonutData) => {
      const c = centers[d.id as keyof typeof centers];
      return `translate(${c.x}, ${c.y})`;
    });

  // Background circle for donuts - explicitly setting a light fill color, not black
  donutGroup.append("path")
    .attr("d", arcBg({} as any) as string)
    .attr("fill", "#F1F1F1");

  donutGroup.each(function(d: DonutData) {
    let fillColor = "";
    let textColor = "";
    
    if (d.id === "PV") {
      fillColor = "#66BB6A";
      textColor = "#4CAF50";
    } else if (d.id === "MAISON") {
      fillColor = "#F97316";
      textColor = "#EA580C";
    } else if (d.id === "RESEAU") {
      fillColor = "#42A5F5";
      textColor = "#2196F3";
    }
    
    if (d.id === "MAISON") {
      d3.select(this).append("path")
        .attr("class", "arc-pv")
        .attr("fill", "#66BB6A")
        .transition()
        .duration(800)
        .attrTween("d", function() {
          const interpolate = d3.interpolate(0, d.ratio * 2 * Math.PI);
          return (t: number) => {
            return d3.arc()
              .innerRadius(outerRadius - thickness)
              .outerRadius(outerRadius)
              .startAngle(0)
              .endAngle(interpolate(t))({} as any) as string;
          };
        });

      d3.select(this).append("path")
        .attr("class", "arc-grid")
        .attr("fill", "#42A5F5")
        .transition()
        .duration(800)
        .attrTween("d", function() {
          const start = d.ratio * 2 * Math.PI;
          const interpolate = d3.interpolate(start, 2 * Math.PI);
          return (t: number) => {
            return d3.arc()
              .innerRadius(outerRadius - thickness)
              .outerRadius(outerRadius)
              .startAngle(start)
              .endAngle(interpolate(t))({} as any) as string;
          };
        });
    } else if (d.id === "RESEAU") {
      // For RESEAU, simply show a transparent/white gauge with network information
      d3.select(this).append("path")
        .attr("class", "arc-value")
        .attr("fill", fillColor)
        .attr("fill-opacity", 0.4)
        .transition()
        .duration(800)
        .attrTween("d", function() {
          const interpolate = d3.interpolate(0, d.ratio * 2 * Math.PI);
          return (t: number) => {
            return (arcValue as any).endAngle(interpolate(t))({} as any) as string;
          };
        });
    } else {
      d3.select(this).append("path")
        .attr("class", "arc-value")
        .attr("fill", fillColor)
        .transition()
        .duration(800)
        .attrTween("d", function() {
          const interpolate = d3.interpolate(0, d.ratio * 2 * Math.PI);
          return (t: number) => {
            return (arcValue as any).endAngle(interpolate(t))({} as any) as string;
          };
        });
    }
    
    // Create icon container at the top of donut
    const iconY = -40;
    
    const foreignObject = d3.select(this)
      .append("foreignObject")
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
    } else if (d.id === "RESEAU") {
      ReactDOM.render(
        React.createElement(Zap, { size: 24, color: textColor, strokeWidth: 2 }),
        container
      );
    }

    // Percentage text (in the center)
    if (d.id === "PV" || d.id === "MAISON") {
      d3.select(this).append("text")
        .attr("fill", textColor)
        .attr("font-size", 16)
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle") 
        .attr("dy", 10)
        .text(`${Math.round(d.ratio * 100)}%`);

      d3.select(this).append("text")
        .attr("fill", textColor)
        .attr("font-size", 14)
        .attr("text-anchor", "middle")
        .attr("dy", 30)
        .text(`${d.totalKwh.toFixed(1)} kWh`);
    } else if (d.id === "RESEAU") {
      // For RESEAU, display the import and export values
      d3.select(this).append("text")
        .attr("fill", textColor)
        .attr("font-size", 16)
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle") 
        .attr("dy", 5)
        .text("Réseau");

      if (d.importTotal !== undefined && d.exportTotal !== undefined) {
        // Import indicator with ArrowRight icon
        const importForeignObject = d3.select(this)
          .append("foreignObject")
          .attr("width", 16)
          .attr("height", 16)
          .attr("x", -36)
          .attr("y", 15);
        
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

        d3.select(this).append("text")
          .attr("fill", textColor)
          .attr("font-size", 12)
          .attr("text-anchor", "middle")
          .attr("x", 10)
          .attr("dy", 25)
          .text(`${d.importTotal.toFixed(1)} kWh`);

        // Export indicator with ArrowLeft icon
        const exportForeignObject = d3.select(this)
          .append("foreignObject")
          .attr("width", 16)
          .attr("height", 16)
          .attr("x", -36)
          .attr("y", 35);
        
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

        d3.select(this).append("text")
          .attr("fill", "#388E3C")
          .attr("font-size", 12)
          .attr("text-anchor", "middle")
          .attr("x", 10)
          .attr("dy", 42)
          .text(`${d.exportTotal.toFixed(1)} kWh`);
      }
    }
  });
}
