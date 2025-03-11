import { useEffect, RefObject, Dispatch, SetStateAction } from 'react';
import * as d3 from 'd3';
import { ShellyEMData, ShellyConfig } from '@/lib/types';

interface UseD3RealtimeEnergyFlowVisualizationProps {
  svgRef: RefObject<SVGSVGElement>;
  data: ShellyEMData | null;
  isClient: boolean;
  setIsClient: Dispatch<SetStateAction<boolean>>;
  config: ShellyConfig | null;
}

export function useD3RealtimeEnergyFlowVisualization({
  svgRef,
  data,
  isClient,
  setIsClient,
  config
}: UseD3RealtimeEnergyFlowVisualizationProps) {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      setIsClient(true);
    }
  }, [setIsClient]);

  useEffect(() => {
    if (!data || !svgRef.current || !isClient) return;

    // Get power values from Shelly config (or use defaults)
    const inverterPowerKVA = config?.inverter_power_kva || 3.0;
    const gridSubscriptionKVA = config?.grid_subscription_kva || 6.0;
    
    console.log("Energy flow config values:", {
      inverterPowerKVA,
      gridSubscriptionKVA,
      rawConfig: config
    });

    const inverterMaxPower = inverterPowerKVA * 1000; // Convert to watts
    const gridMaxPower = gridSubscriptionKVA * 1000;  // Convert to watts

    // Clear previous content
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Define colors
    const gridColor = "#2563eb";   // Tailwind's blue-700
    const solarColor = "#facc15";  // Tailwind's yellow-400
    const homeColor = "#4ade80";    // Tailwind's green-400
    const grayColor = "#9ca3af";    // Tailwind's gray-400

    // Define sizes
    const width = 700;
    const height = 500;
    const nodeRadius = 50;
    const arrowSize = 10;

    // Utility function to create a gauge arc
    const createGaugeArc = (ratio: number, color: string, innerRadius: number, outerRadius: number) => {
      const angle = ratio * Math.PI;
      const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius)
        .startAngle(-Math.PI / 2)
        .endAngle(-Math.PI / 2 + angle);
      return arc();
    };

    // Utility function to create a node
    const createNode = (x: number, y: number, color: string, label: string) => {
      const nodeGroup = svg.append("g").attr("transform", `translate(${x},${y})`);
      nodeGroup.append("circle").attr("r", nodeRadius).attr("fill", color);
      nodeGroup.append("text")
        .text(label)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("fill", "white")
        .style("font-size", "16px")
        .style("font-weight", "bold");
      return nodeGroup;
    };

    // Utility function to create an energy flow arrow
    const createEnergyFlow = (sourceX: number, sourceY: number, targetX: number, targetY: number, color: string, flowAmount: number, maxFlow: number) => {
      if (flowAmount === 0) return;

      const arrowWidth = 10 * (flowAmount / maxFlow);
      const arrowHeadSize = arrowSize * (flowAmount / maxFlow);

      const dx = targetX - sourceX;
      const dy = targetY - sourceY;
      const angle = Math.atan2(dy, dx);

      const midX = sourceX + dx / 2;
      const midY = sourceY + dy / 2;

      svg.append("line")
        .attr("x1", sourceX)
        .attr("y1", sourceY)
        .attr("x2", targetX)
        .attr("y2", targetY)
        .attr("stroke", color)
        .attr("stroke-width", arrowWidth)
        .attr("marker-end", `url(#arrowhead-${color.replace("#", "")})`);

      // Add flow amount text in the middle of the arrow
      svg.append("text")
        .attr("x", midX)
        .attr("y", midY - 15)
        .text(`${flowAmount.toFixed(0)} W`)
        .attr("text-anchor", "middle")
        .attr("fill", color)
        .style("font-size", "12px");
    };

    // Define arrowheads
    const defineArrowhead = (color: string) => {
      svg.append('defs')
        .append('marker')
        .attr('id', `arrowhead-${color.replace("#", "")}`)
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 0)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .attr('xoverflow', 'visible')
        .append('svg:path')
        .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
        .attr('fill', color);
    };

    defineArrowhead(gridColor);
    defineArrowhead(solarColor);
    defineArrowhead(homeColor);
    defineArrowhead(grayColor);

    // Create nodes
    const gridNode = createNode(width * 0.2, height * 0.2, gridColor, "Réseau");
    const solarNode = createNode(width * 0.8, height * 0.2, solarColor, "Solaire");
    const homeNode = createNode(width * 0.5, height * 0.7, homeColor, "Maison");

    // Extract and process data
    const power = data.power || 0;                      // Grid usage (positive = from grid, negative = to grid)
    const pvPower = data.pv_power || 0;                 // Solar production from PV
    
    // Calculate home consumption (PV + grid = consumption, can't be negative)
    const homeConsumption = Math.max(0, pvPower + power);
    const pvToGrid = power < 0 ? Math.abs(power) : 0;
    const pvToHome = pvPower - pvToGrid;
    const gridToHome = power > 0 ? power : 0;

    // For visualization ratios (for gauge fill amounts)
    const pvRatio = Math.min(1, pvPower / inverterMaxPower);  // PV production relative to inverter max
    const gridRatio = Math.min(1, Math.abs(power) / gridMaxPower);  // Grid usage relative to subscription
    
    // Calculate PV-to-Home ratio (for segment fill in house)
    const pvToHomeRatio = homeConsumption > 0 ? pvToHome / homeConsumption : 0;
    const gridToHomeRatio = homeConsumption > 0 ? gridToHome / homeConsumption : 0;
    
    // Calculate real home consumption (PV to home + grid to home)
    const realHomeConsumption = pvToHome + gridToHome;
    
    // Fix: Use proper ratio for house gauge based on actual consumption relative to grid max subscription
    const homeRatio = Math.min(1, realHomeConsumption / gridMaxPower);
    
    console.log("Energy flow calculations:", {
      power,
      pvPower,
      homeConsumption,
      pvToGrid,
      pvToHome,
      gridToHome,
      realHomeConsumption,
      pvRatio,
      gridRatio,
      homeRatio,
      pvToHomeRatio,
      gridToHomeRatio,
      inverterMaxPower,
      gridMaxPower
    });

    // Create energy flows
    createEnergyFlow(gridNode.attr("x"), gridNode.attr("y"), homeNode.attr("x"), homeNode.attr("y"), gridColor, gridToHome, gridMaxPower);
    createEnergyFlow(solarNode.attr("x"), solarNode.attr("y"), homeNode.attr("x"), homeNode.attr("y"), solarColor, pvToHome, inverterMaxPower);
    createEnergyFlow(solarNode.attr("x"), solarNode.attr("y"), gridNode.attr("x"), gridNode.attr("y"), grayColor, pvToGrid, inverterMaxPower);

    // Add gauges to nodes
    // Grid gauge
    const gridGaugeRadius = nodeRadius * 1.3;
    const gridGauge = svg.append("g").attr("transform", `translate(${width * 0.2},${height * 0.2})`);
    gridGauge.append("path")
      .datum({ endAngle: Math.PI / 2 })
      .style("fill", grayColor)
      .attr("d", d3.arc()
        .innerRadius(gridGaugeRadius * 0.8)
        .outerRadius(gridGaugeRadius)
        .startAngle(-Math.PI / 2)
      );
    gridGauge.append("path")
      .datum({ endAngle: Math.PI / 2 })
      .style("fill", gridColor)
      .attr("d", createGaugeArc(gridRatio, gridColor, gridGaugeRadius * 0.8, gridGaugeRadius));

    // Solar gauge
    const solarGaugeRadius = nodeRadius * 1.3;
    const solarGauge = svg.append("g").attr("transform", `translate(${width * 0.8},${height * 0.2})`);
    solarGauge.append("path")
      .datum({ endAngle: Math.PI / 2 })
      .style("fill", grayColor)
      .attr("d", d3.arc()
        .innerRadius(solarGaugeRadius * 0.8)
        .outerRadius(solarGaugeRadius)
        .startAngle(-Math.PI / 2)
      );
    solarGauge.append("path")
      .datum({ endAngle: Math.PI / 2 })
      .style("fill", solarColor)
      .attr("d", createGaugeArc(pvRatio, solarColor, solarGaugeRadius * 0.8, solarGaugeRadius));

    // Home gauge (split into two segments)
    const homeGaugeRadius = nodeRadius * 1.3;
    const homeGauge = svg.append("g").attr("transform", `translate(${width * 0.5},${height * 0.7})`);
    homeGauge.append("path")
      .datum({ endAngle: Math.PI / 2 })
      .style("fill", grayColor)
      .attr("d", d3.arc()
        .innerRadius(homeGaugeRadius * 0.8)
        .outerRadius(homeGaugeRadius)
        .startAngle(-Math.PI / 2)
      );
    // Grid to Home segment
    homeGauge.append("path")
      .datum({ endAngle: Math.PI / 2 })
      .style("fill", gridColor)
      .attr("d", createGaugeArc(gridToHomeRatio * homeRatio, gridColor, homeGaugeRadius * 0.8, homeGaugeRadius));
    // Solar to Home segment (offset by the grid segment)
    homeGauge.append("path")
      .datum({ endAngle: Math.PI / 2 })
      .style("fill", solarColor)
      .attr("d", createGaugeArc(pvToHomeRatio * homeRatio, solarColor, homeGaugeRadius * 0.8, homeGaugeRadius));
  });
}
