import * as d3 from 'd3';
import { HousePlug, Sun, Zap, ArrowRight, ArrowLeft } from 'lucide-react';
import React from 'react';
import ReactDOM from 'react-dom';
import { PowerData } from '@/hooks/useD3EnergyFlowVisualization';

interface Center {
  x: number;
  y: number;
}

interface FluxData {
  source: string;
  target: string;
  w: number;
}

interface DonutData {
  id: string;
  label: string;
  totalW: number;
  maxW: number;
  ratio: number;
  importTotal?: number;
  exportTotal?: number;
  selfConsumptionRatio?: number;
}

// Helper to store the current angle state for animations
interface AngleState {
  [key: string]: number;
}

// Global state to store current angles per element for smooth transitions
const currentAngles: AngleState = {};

export function createFluxPaths(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  fluxData: FluxData[],
  centers: Record<string, Center>,
  outerRadius: number
) {
  const wValues = fluxData.map(f => f.w);
  const maxW = Math.max(...wValues, 1); // Ensure non-zero
  const minW = Math.min(...wValues);

  const strokeScale = d3.scaleLinear()
    .domain([Math.max(0.1, minW), Math.max(1, maxW)])
    .range([2, 8]);

  function getFluxColor(d: FluxData) {
    if(d.source === "PV") return "#66BB6A";
    if(d.source === "RESEAU") return "#42A5F5";
    return "#888";
  }

  // Clear any existing flux paths
  svg.selectAll(".flux").remove();
  svg.selectAll(".flux-label-container").remove();

  const fluxPaths = svg.selectAll(".flux")
    .data(fluxData)
    .enter()
    .append("path")
    .attr("class", "flux")
    .attr("fill", "none")
    .attr("stroke", d => getFluxColor(d))
    .attr("stroke-width", d => strokeScale(Math.max(0.1, d.w)))
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
        .text(`${formatPower(d.w)}`);
    });

  return fluxPaths;
}

// Helper function to format power values
function formatPower(watts: number): string {
  if (watts >= 1000) {
    return `${(watts / 1000).toFixed(1)} kW`;
  } else {
    return `${Math.round(watts)} W`;
  }
}

export function createDonutCharts(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  donutsData: DonutData[],
  centers: Record<string, Center>,
  outerRadius: number,
  thickness: number,
  prevDataRef?: React.MutableRefObject<PowerData>,
  mode?: 'daily' | 'realtime'
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

  // Create donut group containers if they don't exist
  donutsData.forEach(data => {
    const id = data.id;
    const center = centers[id as keyof typeof centers];
    
    // Check if group exists
    if (svg.select(`.donut-${id}`).empty()) {
      svg.append("g")
        .attr("class", `donut donut-${id}`)
        .attr("transform", `translate(${center.x}, ${center.y})`);
    }
  });

  // Update each donut independently
  donutsData.forEach(d => {
    const donutGroup = svg.select(`.donut-${d.id}`);
    
    // Create background circle for donuts if it doesn't exist
    if (donutGroup.select(".donut-bg").empty()) {
      donutGroup.append("path")
        .attr("class", "donut-bg")
        .attr("d", arcBg({} as any))
        .attr("fill", "#F1F1F1");
    }

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
      // For MAISON, create a gauge from 0 to max consumption
      const normalizedValue = Math.min(d.totalW / d.maxW, 1);
      const angle = normalizedValue * 240 - 120; // -120 to +120 degrees

      // Get the element ID for the angle state
      const elementId = `arc-value-maison`;
      
      // Initialize or get the current angle from our state object
      if (currentAngles[elementId] === undefined) {
        currentAngles[elementId] = -Math.PI/2; // Initial angle (vertical top)
      }

      // Select the arc path for maison gauge (or create it if it doesn't exist)
      let arcPath = donutGroup.select(".arc-value-maison");
      
      if (arcPath.empty()) {
        arcPath = donutGroup.append("path")
          .attr("class", "arc-value-maison")
          .attr("fill", fillColor)
          .attr("d", d3.arc()
            .innerRadius(outerRadius - thickness)
            .outerRadius(outerRadius)
            .startAngle(-Math.PI/2) // Start at top (North)
            .endAngle(-Math.PI/2)({} as any));
      }
      
      // Update with transition
      arcPath.transition()
        .duration(800)
        .attrTween("d", function() {
          // Get the current angle from our state object
          const currentEndAngle = currentAngles[elementId];
          const targetEndAngle = -Math.PI/2 + angle * Math.PI / 180;
          
          // Store the target angle as the new current for next update
          currentAngles[elementId] = targetEndAngle;
          
          return (t: number) => {
            const interpolatedAngle = d3.interpolate(currentEndAngle, targetEndAngle)(t);
            return d3.arc()
              .innerRadius(outerRadius - thickness)
              .outerRadius(outerRadius)
              .startAngle(-Math.PI/2) // Start at top (North)
              .endAngle(interpolatedAngle)({} as any);
          };
        });
      
    } else if (d.id === "RESEAU") {
      // For RESEAU, create a gauge from -max to +max power
      // Negative = injection (export), Positive = consumption (import)
      const importValue = d.importTotal || 0;
      const exportValue = d.exportTotal || 0;
      
      // Export (negative, shown in green)
      if (exportValue > 0) {
        const normalizedExport = Math.min(exportValue / d.maxW, 1);
        const exportAngle = normalizedExport * 120; // 0 to 120 degrees
        
        // Get the element ID for the angle state
        const exportElementId = `arc-export`;
        
        // Initialize or get the current angle from our state object
        if (currentAngles[exportElementId] === undefined) {
          currentAngles[exportElementId] = -Math.PI/2; // Initial angle
        }
        
        let exportArc = donutGroup.select(".arc-export");
        
        if (exportArc.empty()) {
          exportArc = donutGroup.append("path")
            .attr("class", "arc-export")
            .attr("fill", "#388E3C") // Green for export
            .attr("d", d3.arc()
              .innerRadius(outerRadius - thickness)
              .outerRadius(outerRadius)
              .startAngle(-Math.PI/2) // Start at top (North)
              .endAngle(-Math.PI/2)({} as any));
        }
        
        exportArc.transition()
          .duration(800)
          .attrTween("d", function() {
            const currentEndAngle = currentAngles[exportElementId];
            const targetEndAngle = -Math.PI/2 - exportAngle * Math.PI / 180;
            
            // Store the target angle as the new current for next update
            currentAngles[exportElementId] = targetEndAngle;
            
            return (t: number) => {
              const interpolatedAngle = d3.interpolate(currentEndAngle, targetEndAngle)(t);
              return d3.arc()
                .innerRadius(outerRadius - thickness)
                .outerRadius(outerRadius)
                .startAngle(-Math.PI/2) // Start at top (North)
                .endAngle(interpolatedAngle)({} as any);
            };
          });
      } else {
        // If no export, reset the export arc
        const exportElementId = `arc-export`;
        const exportArc = donutGroup.select(".arc-export");
        
        if (!exportArc.empty()) {
          exportArc.transition()
            .duration(800)
            .attrTween("d", function() {
              const currentEndAngle = currentAngles[exportElementId] || -Math.PI/2;
              const targetEndAngle = -Math.PI/2;
              
              // Store the target angle as the new current for next update
              currentAngles[exportElementId] = targetEndAngle;
              
              return (t: number) => {
                const interpolatedAngle = d3.interpolate(currentEndAngle, targetEndAngle)(t);
                return d3.arc()
                  .innerRadius(outerRadius - thickness)
                  .outerRadius(outerRadius)
                  .startAngle(-Math.PI/2)
                  .endAngle(interpolatedAngle)({} as any);
              };
            });
        }
      }
      
      // Import (positive, shown in red)
      if (importValue > 0) {
        const normalizedImport = Math.min(importValue / d.maxW, 1);
        const importAngle = normalizedImport * 120; // 0 to 120 degrees
        
        // Get the element ID for the angle state
        const importElementId = `arc-import`;
        
        // Initialize or get the current angle from our state object
        if (currentAngles[importElementId] === undefined) {
          currentAngles[importElementId] = -Math.PI/2; // Initial angle
        }
        
        let importArc = donutGroup.select(".arc-import");
        
        if (importArc.empty()) {
          importArc = donutGroup.append("path")
            .attr("class", "arc-import")
            .attr("fill", "#EF5350") // Red for import
            .attr("d", d3.arc()
              .innerRadius(outerRadius - thickness)
              .outerRadius(outerRadius)
              .startAngle(-Math.PI/2) // Start at top (North)
              .endAngle(-Math.PI/2)({} as any));
        }
        
        importArc.transition()
          .duration(800)
          .attrTween("d", function() {
            const currentEndAngle = currentAngles[importElementId];
            const targetEndAngle = -Math.PI/2 + importAngle * Math.PI / 180;
            
            // Store the target angle as the new current for next update
            currentAngles[importElementId] = targetEndAngle;
            
            return (t: number) => {
              const interpolatedAngle = d3.interpolate(currentEndAngle, targetEndAngle)(t);
              return d3.arc()
                .innerRadius(outerRadius - thickness)
                .outerRadius(outerRadius)
                .startAngle(-Math.PI/2)
                .endAngle(interpolatedAngle)({} as any);
            };
          });
      } else {
        // If no import, reset the import arc
        const importElementId = `arc-import`;
        const importArc = donutGroup.select(".arc-import");
        
        if (!importArc.empty()) {
          importArc.transition()
            .duration(800)
            .attrTween("d", function() {
              const currentEndAngle = currentAngles[importElementId] || -Math.PI/2;
              const targetEndAngle = -Math.PI/2;
              
              // Store the target angle as the new current for next update
              currentAngles[importElementId] = targetEndAngle;
              
              return (t: number) => {
                const interpolatedAngle = d3.interpolate(currentEndAngle, targetEndAngle)(t);
                return d3.arc()
                  .innerRadius(outerRadius - thickness)
                  .outerRadius(outerRadius)
                  .startAngle(-Math.PI/2)
                  .endAngle(interpolatedAngle)({} as any);
              };
            });
        }
      }
    } else if (d.id === "PV") {
      // For PV, create a gauge from 0 to max production (inverter power)
      const normalizedValue = Math.min(d.totalW / d.maxW, 1);
      const angle = normalizedValue * 240 - 120; // -120 to +120 degrees
      
      // Get the element ID for the angle state
      const elementId = `arc-value-pv`;
      
      // Initialize or get the current angle from our state object
      if (currentAngles[elementId] === undefined) {
        currentAngles[elementId] = -Math.PI/2; // Initial angle
      }
      
      let pvArc = donutGroup.select(".arc-value-pv");
      
      if (pvArc.empty()) {
        pvArc = donutGroup.append("path")
          .attr("class", "arc-value-pv")
          .attr("fill", fillColor)
          .attr("d", d3.arc()
            .innerRadius(outerRadius - thickness)
            .outerRadius(outerRadius)
            .startAngle(-Math.PI/2) // Start at top (North)
            .endAngle(-Math.PI/2)({} as any));
      }
      
      pvArc.transition()
        .duration(800)
        .attrTween("d", function() {
          const currentEndAngle = currentAngles[elementId];
          const targetEndAngle = -Math.PI/2 + angle * Math.PI / 180;
          
          // Store the target angle as the new current for next update
          currentAngles[elementId] = targetEndAngle;
          
          return (t: number) => {
            const interpolatedAngle = d3.interpolate(currentEndAngle, targetEndAngle)(t);
            return d3.arc()
              .innerRadius(outerRadius - thickness)
              .outerRadius(outerRadius)
              .startAngle(-Math.PI/2)
              .endAngle(interpolatedAngle)({} as any);
          };
        });
    }
    
    // Handle the icon and text only once
    if (donutGroup.select(".icon-container").empty()) {
      // Create icon container at the top of donut
      const iconY = -40;
      
      const foreignObject = donutGroup
        .append("foreignObject")
        .attr("class", "icon-container")
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
    }

    // Update the power values in the center (update these on every render)
    donutGroup.selectAll(".power-value").remove();
    
    if (d.id === "PV") {
      if (mode === 'daily') {
        // Format kWh value
        const kWhValue = (d.totalW / 1000).toFixed(1);
        
        // Production value in kWh
        donutGroup.append("text")
          .attr("class", "power-value")
          .attr("fill", textColor)
          .attr("font-size", 16)
          .attr("font-weight", "bold")
          .attr("text-anchor", "middle") 
          .attr("dy", 0)
          .text(`${kWhValue} kWh`);

        // Self-consumption ratio if available
        if (d.selfConsumptionRatio !== undefined) {
          donutGroup.append("text")
            .attr("class", "power-value")
            .attr("fill", textColor)
            .attr("font-size", 12)
            .attr("text-anchor", "middle")
            .attr("dy", 20)
            .text(`${d.selfConsumptionRatio.toFixed(0)}% auto.`);
        }
      } else {
        // En mode temps réel, garder l'affichage actuel
        donutGroup.append("text")
          .attr("class", "power-value")
          .attr("fill", textColor)
          .attr("font-size", 16)
          .attr("font-weight", "bold")
          .attr("text-anchor", "middle") 
          .attr("dy", 5)
          .text(formatPower(d.totalW));

        donutGroup.append("text")
          .attr("class", "power-value")
          .attr("fill", textColor)
          .attr("font-size", 12)
          .attr("text-anchor", "middle")
          .attr("dy", 25)
          .text(`Max: ${formatPower(d.maxW)}`);
      }
    } else if (d.id === "MAISON") {
      donutGroup.append("text")
        .attr("class", "power-value")
        .attr("fill", textColor)
        .attr("font-size", 16)
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle") 
        .attr("dy", 5)
        .text(formatPower(d.totalW));
    } else if (d.id === "RESEAU") {
      // For RESEAU, display the import and export values
      donutGroup.append("text")
        .attr("class", "power-value")
        .attr("fill", textColor)
        .attr("font-size", 16)
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle") 
        .attr("dy", 5)
        .text("Réseau");

      if (d.importTotal !== undefined && d.exportTotal !== undefined) {
        // Import indicator with ArrowRight icon
        if (donutGroup.select(".import-icon").empty()) {
          const importForeignObject = donutGroup
            .append("foreignObject")
            .attr("class", "import-icon")
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
            React.createElement(ArrowRight, { size: 16, color: "#EF5350", strokeWidth: 2 }),
            importContainer
          );
        }

        donutGroup.append("text")
          .attr("class", "power-value")
          .attr("fill", "#EF5350")
          .attr("font-size", 12)
          .attr("text-anchor", "middle")
          .attr("x", 10)
          .attr("dy", 25)
          .text(formatPower(d.importTotal));

        // Export indicator with ArrowLeft icon
        if (donutGroup.select(".export-icon").empty()) {
          const exportForeignObject = donutGroup
            .append("foreignObject")
            .attr("class", "export-icon")
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
        }

        donutGroup.append("text")
          .attr("class", "power-value")
          .attr("fill", "#388E3C")
          .attr("font-size", 12)
          .attr("text-anchor", "middle")
          .attr("x", 10)
          .attr("dy", 42)
          .text(formatPower(d.exportTotal));
      }
    }
  });
}
