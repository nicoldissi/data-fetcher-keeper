
import * as d3 from 'd3';
import { HousePlug, Sun, Zap, ArrowRight, ArrowLeft, Gauge, TrendingUp, TrendingDown } from 'lucide-react';
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
}

interface NodeData {
  id: string;
  label: string;
  value: string;
  color: string;
  gaugeValue?: number;
  maxCapacity?: number;
  direction?: 'import' | 'export';  // Fixed type to be a union of literals
  power?: number;
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

  // Add gauges for specific nodes
  nodeGroups.each(function(d) {
    if (d.id === "PV" && d.gaugeValue !== undefined) {
      createPVGauge(d3.select(this), d.gaugeValue, nodeRadius, d.color);
    }
    
    if (d.id === "GRID" && d.direction && d.power !== undefined) {
      createGridGauge(d3.select(this), d.direction, Math.abs(d.power), nodeRadius, d.color);
    }
  });

  return nodeGroups;
}

function createPVGauge(
  nodeGroup: d3.Selection<d3.BaseType, NodeData, null, undefined>,
  value: number,
  nodeRadius: number,
  color: string
) {
  const gaugeY = nodeRadius * 1.5;
  const gaugeWidth = nodeRadius * 2;
  const gaugeHeight = 12;
  
  // Gauge background
  nodeGroup.append("rect")
    .attr("x", -gaugeWidth / 2)
    .attr("y", gaugeY)
    .attr("width", gaugeWidth)
    .attr("height", gaugeHeight)
    .attr("rx", gaugeHeight / 2)
    .attr("fill", "#e5e7eb"); // Light gray background

  // Calculate gauge fill width based on percentage
  const fillWidth = (value / 100) * gaugeWidth;
  
  // Gauge fill (progress bar)
  nodeGroup.append("rect")
    .attr("x", -gaugeWidth / 2)
    .attr("y", gaugeY)
    .attr("width", fillWidth)
    .attr("height", gaugeHeight)
    .attr("rx", gaugeHeight / 2)
    .attr("fill", color);
    
  // Add percentage text below gauge
  nodeGroup.append("text")
    .attr("text-anchor", "middle")
    .attr("y", gaugeY + gaugeHeight + 15)
    .attr("fill", color)
    .attr("font-size", "11px")
    .attr("font-weight", "medium")
    .text(`${Math.round(value)}% de capacité`);
}

function createGridGauge(
  nodeGroup: d3.Selection<d3.BaseType, NodeData, null, undefined>,
  direction: 'import' | 'export',
  power: number,
  nodeRadius: number,
  color: string
) {
  const isImport = direction === 'import';
  const gaugeY = nodeRadius * 1.5;
  const maxWidth = nodeRadius * 2;
  const gaugeHeight = 12;

  // Add direction icon
  const arrowY = gaugeY - 18;
  
  // Create container for icon
  const foreignObject = nodeGroup
    .append("foreignObject")
    .attr("width", 20)
    .attr("height", 20)
    .attr("x", -10)
    .attr("y", arrowY);

  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.justifyContent = 'center';
  container.style.alignItems = 'center';
  container.style.width = '100%';
  container.style.height = '100%';
  
  foreignObject.node()?.appendChild(container);
  
  ReactDOM.render(
    React.createElement(
      isImport ? TrendingDown : TrendingUp, 
      { size: 18, color: color, strokeWidth: 2 }
    ),
    container
  );
  
  // Build a power scale for visualization
  // This is a simplified scale. In a real app, you might want to use a logarithmic scale
  // or a more sophisticated approach to handle various power ranges
  const powerScale = d3.scaleLinear()
    .domain([0, 5000]) // Assuming max power of 5kW. Adjust as needed
    .range([0, maxWidth])
    .clamp(true);
  
  const gaugeWidth = powerScale(power);
  
  // Gauge background
  nodeGroup.append("rect")
    .attr("x", -maxWidth / 2)
    .attr("y", gaugeY)
    .attr("width", maxWidth)
    .attr("height", gaugeHeight)
    .attr("rx", gaugeHeight / 2)
    .attr("fill", "#e5e7eb"); // Light gray background

  // Gauge fill (progress bar)
  nodeGroup.append("rect")
    .attr("x", -maxWidth / 2)
    .attr("y", gaugeY)
    .attr("width", gaugeWidth)
    .attr("height", gaugeHeight)
    .attr("rx", gaugeHeight / 2)
    .attr("fill", color);
    
  // Add direction text below gauge
  nodeGroup.append("text")
    .attr("text-anchor", "middle")
    .attr("y", gaugeY + gaugeHeight + 15)
    .attr("fill", color)
    .attr("font-size", "11px")
    .attr("font-weight", "medium")
    .text(isImport ? "Consommation" : "Injection");
}
