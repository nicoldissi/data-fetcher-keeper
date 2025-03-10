
import * as d3 from 'd3';
import { HousePlug, Sun, Zap, ArrowRight, ArrowLeft } from 'lucide-react';
import React from 'react';
import ReactDOM from 'react-dom';

interface Center {
  x: number;
  y: number;
}

interface FlowData {
  source: string;
  target: string;
  power: number;
  title: string;
}

interface NodeData {
  id: string;
  label: string;
  value: string;
  color: string;
}

export function createRealtimeFluxPaths(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  fluxData: FlowData[],
  centers: Record<string, Center>,
  nodeRadius: number
) {
  const powerValues = fluxData.map(f => Math.abs(f.power));
  const maxPower = Math.max(...powerValues, 1);

  const strokeScale = d3.scaleLinear()
    .domain([0, maxPower])
    .range([2, 10]);

  function getFluxColor(d: FlowData) {
    if (d.source === "PV") return "#66BB6A";
    if (d.source === "GRID") return "#42A5F5";
    return "#888";
  }

  const fluxPaths = svg.selectAll(".flux")
    .data(fluxData)
    .enter()
    .append("path")
    .attr("class", "flux")
    .attr("fill", "none")
    .attr("stroke", d => getFluxColor(d))
    .attr("stroke-width", d => strokeScale(Math.abs(d.power)))
    .attr("stroke-linecap", "round")
    .attr("stroke-dasharray", "8 8")
    .attr("filter", "url(#glow)")
    .attr("d", (d: FlowData) => {
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

  function animateFlux() {
    fluxPaths
      .transition()
      .duration(1500)
      .ease(d3.easeLinear)
      .attrTween("stroke-dashoffset", () => d3.interpolate(0, -16) as any)
      .on("end", animateFlux);
  }
  animateFlux();

  function getBorderColor(d: FlowData) {
    if (d.source === "PV") return "#4CAF50";
    if (d.source === "GRID") return "#2196F3";
    return "#888";
  }

  function getTextColor(d: FlowData) {
    if (d.source === "PV") return "#4CAF50";
    if (d.source === "GRID") return "#2196F3";
    return "#555";
  }

  svg.selectAll(".flux-label-container")
    .data(fluxData)
    .enter()
    .append("g")
    .attr("class", "flux-label-container")
    .each(function(d: FlowData) {
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
      
      const tParam = 0.5;
      const bezierX = (1-tParam)*(1-tParam)*x1 + 2*(1-tParam)*tParam*mx + tParam*tParam*x2;
      const bezierY = (1-tParam)*(1-tParam)*y1 + 2*(1-tParam)*tParam*my + tParam*tParam*y2;

      const borderColor = getBorderColor(d);
      const textColor = getTextColor(d);

      // Prepare label content
      const title = d.title;
      const valueText = `${Math.abs(d.power).toFixed(1)} W`;
      
      // Calculate responsive width based on text content
      const titleLength = title.length;
      const valueLength = valueText.length;
      const maxLength = Math.max(titleLength, valueLength);
      const labelWidth = Math.max(80, maxLength * 8); // 8px per character with minimum of 80px
      
      // Create a rectangle with rounded corners for the label background
      d3.select(this)
        .append("rect")
        .attr("x", bezierX - labelWidth/2)
        .attr("y", bezierY - 25)
        .attr("width", labelWidth)
        .attr("height", 40)
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
        .attr("y", bezierY + 10)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", 13)
        .attr("font-weight", "bold")
        .attr("fill", textColor)
        .text(valueText);
    });

  return fluxPaths;
}

export function createRealtimeNodes(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  nodesData: NodeData[],
  centers: Record<string, Center>,
  nodeRadius: number
) {
  const nodeGroups = svg.selectAll(".node")
    .data(nodesData)
    .enter()
    .append("g")
    .attr("class", d => `node-${d.id}`)
    .attr("transform", (d: NodeData) => {
      const center = centers[d.id];
      return `translate(${center.x}, ${center.y})`;
    });

  // Add node circles
  nodeGroups.append("circle")
    .attr("r", nodeRadius)
    .attr("fill", "white")
    .attr("stroke", d => d.color)
    .attr("stroke-width", 3)
    .style("filter", "drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.1))");

  // Add icons
  nodeGroups.each(function(d) {
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
        React.createElement(Sun, { size: 24, color: d.color, strokeWidth: 2 }),
        container
      );
    } else if (d.id === "HOME") {
      ReactDOM.render(
        React.createElement(HousePlug, { size: 24, color: d.color, strokeWidth: 2 }),
        container
      );
    } else if (d.id === "GRID") {
      ReactDOM.render(
        React.createElement(Zap, { size: 24, color: d.color, strokeWidth: 2 }),
        container
      );
    }
  });

  // Add node labels
  nodeGroups.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "5px")
    .attr("fill", d => d.color)
    .attr("font-weight", "bold")
    .attr("font-size", "16px")
    .text(d => d.label);

  // Add node values
  nodeGroups.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "30px")
    .attr("fill", d => d.color)
    .attr("font-size", "14px")
    .text(d => d.value);

  return nodeGroups;
}
