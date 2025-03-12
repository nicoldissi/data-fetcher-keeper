import * as d3 from 'd3';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { HousePlug, Sun, Zap } from 'lucide-react';
import { DonutData, Center } from './energyFlowUtils';

export function createDonutCharts(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  donutsData: DonutData[],
  centers: Record<string, Center>,
  outerRadius: number,
  thickness: number,
  isDaily: boolean = false
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
    
    let color = d.color || "#888";
    let textColor = d.textColor || "#555";
    
    if (d.id === "PV") {
      createPVDonut(g, d, outerRadius, thickness, textColor);
    } else if (d.id === "GRID") {
      createGridDonut(g, d, outerRadius, thickness, textColor);
    } else if (d.id === "MAISON") {
      createHomeDonut(g, d, outerRadius, thickness, textColor);
    }
  });
}

function createPVDonut(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  d: DonutData,
  outerRadius: number,
  thickness: number,
  textColor: string
) {
  const maxArc = d3.arc()
    .innerRadius(outerRadius - thickness)
    .outerRadius(outerRadius)
    .startAngle(-120 * (Math.PI / 180))
    .endAngle(120 * (Math.PI / 180));
    
  g.append("path")
    .attr("d", maxArc as any)
    .attr("fill", "#8E9196")
    .attr("opacity", 0.2);
    
  if (d.ratio > 0) {
    const startAngle = -120 * (Math.PI / 180);
    const endAngle = startAngle + (d.ratio * 240 * (Math.PI / 180));
    
    const arc = d3.arc()
      .innerRadius(outerRadius - thickness)
      .outerRadius(outerRadius)
      .startAngle(startAngle)
      .endAngle(endAngle);
    
    g.append("path")
      .attr("d", arc as any)
      .attr("fill", d.color || "#66BB6A");
  }

  const iconDiv = document.createElement('div');
  iconDiv.className = 'icon-container';
  
  const iconSize = 24;
  
  const foreignObject = g.append("foreignObject")
    .attr("width", iconSize)
    .attr("height", iconSize)
    .attr("x", -iconSize / 2)
    .attr("y", -iconSize * 1.5);
  
  foreignObject.node()?.appendChild(iconDiv);
  
  // Use createRoot instead of ReactDOM.render
  const root = createRoot(iconDiv);
  root.render(React.createElement(Sun, { size: iconSize, color: textColor }));
  
  g.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("y", 10)
    .attr("fill", textColor)
    .attr("font-size", "18px")
    .attr("font-weight", "500")
    .attr("font-family", "inherit") 
    .text(d.powerValue || "");

  g.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("y", 35)
    .attr("x", 65)
    .attr("fill", textColor)
    .attr("font-size", "12px")
    .attr("font-weight", "400")
    .attr("font-family", "inherit") 
    .text(d.maxValue || "");
}

function createHomeDonut(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  d: DonutData,
  outerRadius: number,
  thickness: number,
  textColor: string
) {
  const maxArc = d3.arc()
    .innerRadius(outerRadius - thickness)
    .outerRadius(outerRadius)
    .startAngle(-120 * (Math.PI / 180))
    .endAngle(120 * (Math.PI / 180));
    
  g.append("path")
    .attr("d", maxArc as any)
    .attr("fill", "#8E9196")
    .attr("opacity", 0.2);
    
  if (d.ratio > 0) {
    const startAngle = -120 * (Math.PI / 180);
    const totalAngle = 240 * (Math.PI / 180);
    const maxAngle = d.ratio * totalAngle;
    
    if (d.homeConsumption && d.homeConsumption > 0) {
      const gridPower = d.gridPower || 0;
      const pvPower = d.pvPower || 0;
      const totalPower = gridPower + pvPower;
      
      if (totalPower > 0) {
        const actualGridRatio = gridPower / totalPower;
        const actualPvRatio = pvPower / totalPower;
        
        const gridAngle = actualGridRatio * maxAngle;
        const pvAngle = actualPvRatio * maxAngle;
        
        if (gridPower > 0) {
          const gridEndAngle = startAngle + gridAngle;
          
          const gridArc = d3.arc()
            .innerRadius(outerRadius - thickness)
            .outerRadius(outerRadius)
            .startAngle(startAngle)
            .endAngle(gridEndAngle);
            
          g.append("path")
            .attr("d", gridArc as any)
            .attr("fill", "#42A5F5");
        }
        
        if (pvPower > 0) {
          const pvStartAngle = startAngle + gridAngle;
          const pvEndAngle = pvStartAngle + pvAngle;
          
          const pvArc = d3.arc()
            .innerRadius(outerRadius - thickness)
            .outerRadius(outerRadius)
            .startAngle(pvStartAngle)
            .endAngle(pvEndAngle);
            
          g.append("path")
            .attr("d", pvArc as any)
            .attr("fill", "#66BB6A");
        }
      }
    }
  }

  const iconDiv = document.createElement('div');
  iconDiv.className = 'icon-container';
  
  const iconSize = 24;
  
  const foreignObject = g.append("foreignObject")
    .attr("width", iconSize)
    .attr("height", iconSize)
    .attr("x", -iconSize / 2)
    .attr("y", -iconSize * 1.5);
  
  foreignObject.node()?.appendChild(iconDiv);
  
  // Use createRoot instead of ReactDOM.render
  const root = createRoot(iconDiv);
  root.render(React.createElement(HousePlug, { size: iconSize, color: textColor }));
  
  g.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("y", 10)
    .attr("fill", textColor)
    .attr("font-size", "18px")
    .attr("font-weight", "500")
    .attr("font-family", "inherit")
    .text(`${d.homeConsumption?.toFixed(0)} W`);
    
  g.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("y", 35)
    .attr("x", 65)
    .attr("fill", textColor)
    .attr("font-size", "12px")
    .attr("font-weight", "400")
    .attr("font-family", "inherit") 
    .text(d.maxValue || "");
}

function createGridDonut(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  d: DonutData,
  outerRadius: number,
  thickness: number,
  textColor: string
) {
  g.append("path")
    .attr("d", d3.arc()
      .innerRadius(outerRadius - thickness)
      .outerRadius(outerRadius)
      .startAngle(-Math.PI)
      .endAngle(Math.PI) as any)
    .attr("fill", "#8E9196")
    .attr("opacity", 0.2);
    
  if (d.exportRatio && d.exportRatio > 0) {
    const startAngle = 0;
    const endAngle = startAngle - (d.exportRatio * 120 * (Math.PI / 180));
    
    const exportArc = d3.arc()
      .innerRadius(outerRadius - thickness)
      .outerRadius(outerRadius)
      .startAngle(endAngle)
      .endAngle(startAngle);
    
    g.append("path")
      .attr("d", exportArc as any)
      .attr("fill", "#66BB6A");
  }
  
  if (d.importRatio && d.importRatio > 0) {
    const startAngle = 0;
    const endAngle = startAngle + (d.importRatio * 120 * (Math.PI / 180));
    
    const importArc = d3.arc()
      .innerRadius(outerRadius - thickness)
      .outerRadius(outerRadius)
      .startAngle(startAngle)
      .endAngle(endAngle);
      
    g.append("path")
      .attr("d", importArc as any)
      .attr("fill", "#0EA5E9");
  }

  const iconDiv = document.createElement('div');
  iconDiv.className = 'icon-container';
  
  const iconSize = 24;
  
  const foreignObject = g.append("foreignObject")
    .attr("width", iconSize)
    .attr("height", iconSize)
    .attr("x", -iconSize / 2)
    .attr("y", -iconSize * 1.5);
  
  foreignObject.node()?.appendChild(iconDiv);
  
  // Use createRoot instead of ReactDOM.render
  const root = createRoot(iconDiv);
  root.render(React.createElement(Zap, { size: iconSize, color: textColor }));
  
  if (d.isExporting) {
    const exportValue = d.powerValue;
    
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("y", 10)
      .attr("fill", "#66BB6A")
      .attr("font-size", "18px")
      .attr("font-weight", "500")
      .attr("font-family", "inherit")
      .text(`${exportValue}`);
      
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("y", 35)
      .attr("x", 65)
      .attr("fill", textColor)
      .attr("font-size", "12px")
      .attr("font-weight", "400")
      .attr("font-family", "inherit") 
      .text(d.maxValue || "");
  } else if (d.isImporting) {
    const importValue = d.powerValue;
    
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("y", 10)
      .attr("fill", "#0EA5E9")
      .attr("font-size", "18px")
      .attr("font-weight", "500")
      .attr("font-family", "inherit")
      .text(`${importValue}`);
      
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("y", 35)
      .attr("x", 65)
      .attr("fill", textColor)
      .attr("font-size", "12px")
      .attr("font-weight", "400")
      .attr("font-family", "inherit") 
      .text(d.maxValue || "");
  }
}
