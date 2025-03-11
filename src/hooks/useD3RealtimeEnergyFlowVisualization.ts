
import { useEffect, RefObject, Dispatch, SetStateAction } from 'react';
import * as d3 from 'd3';
import { ShellyEMData, ShellyConfig } from '@/lib/types';
import ReactDOM from 'react-dom';
import React from 'react';
import { HousePlug, Sun, Zap } from 'lucide-react';

interface UseD3RealtimeEnergyFlowVisualizationProps {
  svgRef: RefObject<SVGSVGElement>;
  data: ShellyEMData | null;
  isClient: boolean;
  setIsClient: Dispatch<SetStateAction<boolean>>;
  config?: ShellyConfig | null;
}

export function useD3RealtimeEnergyFlowVisualization({
  svgRef,
  data,
  isClient,
  setIsClient,
  config
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

    // Convert kVA to Watts (multiply by 1000)
    const inverterKVA = config?.inverter_power_kva !== undefined ? config.inverter_power_kva : 3.0;
    const gridKVA = config?.grid_subscription_kva !== undefined ? config.grid_subscription_kva : 6.0;
    
    const inverterMaxPower = inverterKVA * 1000;
    const gridMaxPower = gridKVA * 1000;

    console.log("Using config values for visualization:", {
      deviceId: config?.deviceId,
      inverterMaxPower,
      gridMaxPower,
      inverterKVA,
      gridKVA,
      raw_inverter_kva: config?.inverter_power_kva,
      raw_grid_kva: config?.grid_subscription_kva,
      configObject: config
    });

    const pvPower = data.pv_power;
    const gridPower = Math.abs(data.power);
    
    const realHomeConsumption = data.pv_power + Math.max(0, data.power);

    const pvRatio = Math.min(1, data.pv_power / inverterMaxPower);
    const homeRatio = Math.min(1, realHomeConsumption / gridMaxPower);

    const isPVProducing = data.pv_power > 6;
    const isGridImporting = data.power > 0;
    const isGridExporting = data.power < 0;

    const pvToHome = isPVProducing ? Math.min(pvPower, realHomeConsumption) : 0;
    const pvToGrid = isPVProducing && isGridExporting ? Math.abs(data.power) : 0;
    const gridToHome = isGridImporting ? gridPower : 0;

    const pvToHomeRatio = realHomeConsumption > 0 ? pvToHome / realHomeConsumption : 0;
    const gridToHomeRatio = realHomeConsumption > 0 ? gridToHome / realHomeConsumption : 0;

    const gridExportRatio = isGridExporting ? Math.min(1, Math.abs(data.power) / gridMaxPower) : 0;
    const gridImportRatio = isGridImporting ? Math.min(1, Math.abs(data.power) / gridMaxPower) : 0;

    const donutsData = [
      { 
        id: "PV", 
        label: "", 
        totalKwh: pvPower / 1000, 
        ratio: pvRatio, 
        selfConsumptionRatio: pvPower > 0 ? (pvToHome / pvPower) * 100 : 0,
        powerValue: `${data.pv_power.toFixed(0)} W`,
        maxValue: `${inverterKVA.toFixed(1)} kW`,
        color: "#66BB6A",
        textColor: "#4CAF50"
      },
      { 
        id: "MAISON", 
        label: "", 
        totalKwh: realHomeConsumption / 1000, 
        ratio: homeRatio,
        pvRatio: pvToHomeRatio,
        gridRatio: gridToHomeRatio,
        powerValue: `${realHomeConsumption.toFixed(0)} W`,
        maxValue: `${gridKVA.toFixed(1)} kW`,
        pvPower: pvToHome,
        gridPower: gridToHome,
        homeConsumption: realHomeConsumption,
        color: "#F97316",
        textColor: "#EA580C"
      },
      { 
        id: "GRID", 
        label: "", 
        totalKwh: gridPower / 1000, 
        ratio: 1,
        importRatio: gridImportRatio,
        exportRatio: gridExportRatio,
        isExporting: isGridExporting,
        isImporting: isGridImporting,
        importTotal: isGridImporting ? gridPower / 1000 : 0, 
        exportTotal: isGridExporting ? gridPower / 1000 : 0,
        powerValue: `${Math.abs(data.power).toFixed(0)} W`,
        maxValue: `${gridKVA.toFixed(1)} kW`,
        color: "#42A5F5",
        textColor: "#2196F3"
      }
    ];

    const fluxData = [];

    if (pvToHome > 0) {
      fluxData.push({ 
        source: "PV", 
        target: "MAISON", 
        kwh: pvToHome / 1000,
        title: "Autoconsommation"
      });
    }

    if (gridToHome > 0) {
      fluxData.push({ 
        source: "GRID", 
        target: "MAISON", 
        kwh: gridToHome / 1000,
        title: "Réseau"
      });
    }

    if (pvToGrid > 0) {
      fluxData.push({ 
        source: "PV", 
        target: "GRID", 
        kwh: pvToGrid / 1000,
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
  }, [data, isClient, svgRef, config]);
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

  const dataIndexMap = new Map(fluxData.map((d, i) => [d.title, i]));

  const tempText = svg.selectAll(".temp-text")
    .data(fluxData)
    .enter()
    .append("text")
    .attr("class", "temp-text")
    .style("visibility", "hidden")
    .text(d => d.title);

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
      
      const index = dataIndexMap.get(d.title);
      const textNode = index !== undefined ? tempText.nodes()[index] : null;
      
      const padding = { x: 10, y: 6 };
      const textWidth = textNode ? textNode.getBBox().width + (padding.x * 2) : 80;
      const textHeight = textNode ? textNode.getBBox().height + (padding.y * 2) : 22;
      
      return `translate(${mx - textWidth/2}, ${my - textHeight/2})`;
    })
    .attr("width", function(d) {
      const index = dataIndexMap.get(d.title);
      const textNode = index !== undefined ? tempText.nodes()[index] : null;
      return textNode ? textNode.getBBox().width + 20 : 80;
    })
    .attr("height", function(d) {
      const index = dataIndexMap.get(d.title);
      const textNode = index !== undefined ? tempText.nodes()[index] : null;
      return textNode ? textNode.getBBox().height + 12 : 22;
    });

  tempText.remove();

  svg.selectAll(".flux-label")
    .data(fluxData)
    .enter()
    .append("text")
    .attr("class", "flux-label")
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "central")
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
    
    let color = d.color;
    let textColor = d.textColor;
    
    if (d.id === "PV") {
      const maxArc = d3.arc()
        .innerRadius(outerRadius - thickness)
        .outerRadius(outerRadius)
        .startAngle(-120 * (Math.PI / 180))
        .endAngle(120 * (Math.PI / 180));
        
      g.append("path")
        .attr("d", maxArc as any)
        .attr("fill", "#8E9196")
        .attr("opacity", 0.2);
    } else if (d.id === "GRID") {
      g.append("path")
        .attr("d", d3.arc()
          .innerRadius(outerRadius - thickness)
          .outerRadius(outerRadius)
          .startAngle(-Math.PI)
          .endAngle(Math.PI) as any)
        .attr("fill", "#8E9196")
        .attr("opacity", 0.2);
    } else {
      const maxArc = d3.arc()
        .innerRadius(outerRadius - thickness)
        .outerRadius(outerRadius)
        .startAngle(-120 * (Math.PI / 180))
        .endAngle(120 * (Math.PI / 180));
        
      g.append("path")
        .attr("d", maxArc as any)
        .attr("fill", "#8E9196")
        .attr("opacity", 0.2);
    }
    
    if (d.ratio > 0) {
      if (d.id === "PV") {
        const startAngle = -120 * (Math.PI / 180);
        const endAngle = startAngle + (d.ratio * 240 * (Math.PI / 180));
        
        const arc = d3.arc()
          .innerRadius(outerRadius - thickness)
          .outerRadius(outerRadius)
          .startAngle(startAngle)
          .endAngle(endAngle);
        
        g.append("path")
          .attr("d", arc as any)
          .attr("fill", color);
      } else if (d.id === "MAISON") {
        const startAngle = -120 * (Math.PI / 180);
        const totalAngle = 240 * (Math.PI / 180);
        
        console.log("MAISON node data:", {
          gridPower: d.gridPower,
          pvPower: d.pvPower,
          homeConsumption: d.homeConsumption,
          pvRatio: d.pvRatio,
          gridRatio: d.gridRatio
        });
        
        if (d.gridPower > 0) {
          const gridRatio = d.gridRatio || 0;
          const gridAngle = gridRatio * totalAngle;
          const gridEndAngle = startAngle + gridAngle;
          
          console.log("Drawing grid segment:", {
            gridRatio,
            gridAngle: gridAngle * (180/Math.PI),
            startAngle: startAngle * (180/Math.PI),
            endAngle: gridEndAngle * (180/Math.PI)
          });
          
          const gridArc = d3.arc()
            .innerRadius(outerRadius - thickness)
            .outerRadius(outerRadius)
            .startAngle(startAngle)
            .endAngle(gridEndAngle);
            
          g.append("path")
            .attr("d", gridArc as any)
            .attr("fill", "#42A5F5");
        }
        
        if (d.pvPower > 0) {
          const pvRatio = d.pvRatio || 0;
          const gridRatio = d.gridRatio || 0;
          
          const pvStartAngle = startAngle + (gridRatio * totalAngle);
          const pvEndAngle = pvStartAngle + (pvRatio * totalAngle);
          
          console.log("Drawing PV segment:", {
            pvRatio,
            pvAngle: (pvRatio * totalAngle) * (180/Math.PI),
            startAngle: pvStartAngle * (180/Math.PI),
            endAngle: pvEndAngle * (180/Math.PI)
          });
          
          const pvArc = d3.arc()
            .innerRadius(outerRadius - thickness)
            .outerRadius(outerRadius)
            .startAngle(pvStartAngle)
            .endAngle(pvEndAngle);
            
          g.append("path")
            .attr("d", pvArc as any)
            .attr("fill", "#66BB6A");
        }
      } else if (d.id === "GRID") {
        if (d.exportRatio > 0) {
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
        
        if (d.importRatio > 0) {
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
    
    if (d.id === "PV") {
      ReactDOM.render(
        React.createElement(Sun, { size: iconSize, color: textColor }),
        iconDiv
      );
      
      g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("y", 10)
        .attr("fill", textColor)
        .attr("font-size", "18px")
        .attr("font-weight", "500")
        .attr("font-family", "inherit") 
        .text(d.powerValue);

      g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("y", 35)
        .attr("x", 65)
        .attr("fill", textColor)
        .attr("font-size", "12px")
        .attr("font-weight", "400")
        .attr("font-family", "inherit") 
        .text(d.maxValue);
        
    } else if (d.id === "MAISON") {
      ReactDOM.render(
        React.createElement(HousePlug, { size: iconSize, color: textColor }),
        iconDiv
      );
      
      g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("y", 10)
        .attr("fill", textColor)
        .attr("font-size", "18px")
        .attr("font-weight", "500")
        .attr("font-family", "inherit")
        .text(`${d.homeConsumption.toFixed(0)} W`);
        
      g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("y", 35)
        .attr("x", 65)
        .attr("fill", textColor)
        .attr("font-size", "12px")
        .attr("font-weight", "400")
        .attr("font-family", "inherit") 
        .text(d.maxValue);
        
    } else if (d.id === "GRID") {
      ReactDOM.render(
        React.createElement(Zap, { size: iconSize, color: textColor }),
        iconDiv
      );
      
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
          .attr("fill", "#66BB6A")
          .attr("font-size", "12px")
          .attr("font-weight", "400")
          .attr("font-family", "inherit") 
          .text(d.maxValue);
          
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
          .attr("fill", "#0EA5E9")
          .attr("font-size", "12px")
          .attr("font-weight", "400")
          .attr("font-family", "inherit") 
          .text(d.maxValue);
          
      } else {
        g.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "0.35em")
          .attr("y", 10)
          .attr("fill", textColor)
          .attr("font-size", "18px")
          .attr("font-weight", "500")
          .attr("font-family", "inherit")
          .text("0 W");
          
        g.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "0.35em")
          .attr("y", 35)
          .attr("x", 65)
          .attr("fill", textColor)
          .attr("font-size", "12px")
          .attr("font-weight", "400")
          .attr("font-family", "inherit") 
          .text(d.maxValue);
      }
    }
  });
}
