
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

  // Ajouter l'arc de contexte pour le PV et GRID
  nodeGroups.each(function(d) {
    if (d.id === "PV" && d.gaugeValue !== undefined) {
      createCircularGauge(d3.select(this), d.gaugeValue, nodeRadius, d.color);
    }
    
    if (d.id === "GRID" && d.direction && d.power !== undefined) {
      createGridCircularGauge(d3.select(this), d.direction, Math.abs(d.power), nodeRadius, d.color);
    }
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
    const iconY = -10; // Moved icon closer to center
    
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
    .attr("dy", "25px")
    .attr("fill", d => d.color)
    .attr("font-weight", "bold")
    .attr("font-size", "14px")
    .text(d => d.label);

  // Add node values
  nodeGroups.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "45px")
    .attr("fill", d => d.color)
    .attr("font-size", "12px")
    .text(d => d.value);

  return nodeGroups;
}

function createCircularGauge(
  nodeGroup: d3.Selection<d3.BaseType, NodeData, null, undefined>,
  value: number,
  nodeRadius: number,
  color: string
) {
  // Pourcentage de la production (0-100%)
  const percentage = Math.min(100, Math.max(0, value)) / 100;
  
  // Create an arc generator
  const arcGenerator = d3.arc<any>()
    .innerRadius(nodeRadius + 5)
    .outerRadius(nodeRadius + 10)
    .startAngle(0)
    .endAngle(percentage * 2 * Math.PI);
  
  // Create background arc
  const backgroundArc = d3.arc<any>()
    .innerRadius(nodeRadius + 5)
    .outerRadius(nodeRadius + 10)
    .startAngle(0)
    .endAngle(2 * Math.PI);
  
  // Add background arc
  nodeGroup.append("path")
    .attr("d", backgroundArc())
    .attr("fill", "#e5e7eb");
  
  // Add foreground arc
  nodeGroup.append("path")
    .attr("d", arcGenerator())
    .attr("fill", color);
}

function createGridCircularGauge(
  nodeGroup: d3.Selection<d3.BaseType, NodeData, null, undefined>, 
  direction: 'import' | 'export',
  power: number,
  nodeRadius: number,
  color: string
) {
  // Construire une échelle pour la visualisation de la puissance
  const powerScale = d3.scaleLinear()
    .domain([0, 5000]) // Suppose une puissance max de 5kW
    .range([0, 1])
    .clamp(true);
  
  const percentage = powerScale(power);
  
  // Create an arc generator
  const arcGenerator = d3.arc<any>()
    .innerRadius(nodeRadius + 5)
    .outerRadius(nodeRadius + 10)
    .startAngle(0)
    .endAngle(percentage * 2 * Math.PI);
  
  // Create background arc
  const backgroundArc = d3.arc<any>()
    .innerRadius(nodeRadius + 5)
    .outerRadius(nodeRadius + 10)
    .startAngle(0)
    .endAngle(2 * Math.PI);
  
  // Add background arc
  nodeGroup.append("path")
    .attr("d", backgroundArc())
    .attr("fill", "#e5e7eb");
  
  // Add foreground arc
  nodeGroup.append("path")
    .attr("d", arcGenerator())
    .attr("fill", color);
  
  // Indicateur de direction
  const arrowSize = 12;
  const arrowY = -nodeRadius - 15;
  
  // Create container for icon
  const foreignObject = nodeGroup
    .append("foreignObject")
    .attr("width", arrowSize + 4)
    .attr("height", arrowSize + 4)
    .attr("x", -(arrowSize + 4) / 2)
    .attr("y", arrowY - (arrowSize + 4) / 2);

  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.justifyContent = 'center';
  container.style.alignItems = 'center';
  container.style.width = '100%';
  container.style.height = '100%';
  
  foreignObject.node()?.appendChild(container);
  
  ReactDOM.render(
    React.createElement(
      direction === 'import' ? TrendingDown : TrendingUp, 
      { size: arrowSize, color: color, strokeWidth: 2 }
    ),
    container
  );
}
