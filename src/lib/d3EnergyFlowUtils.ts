import * as d3 from 'd3';
import { Sun, Home, Network } from 'lucide-react';

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
}

export function createFluxPaths(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  fluxData: FluxData[],
  centers: Record<string, Center>,
  outerRadius: number
) {
  // Échelle pour les largeurs de traits des flux
  const kwhValues = fluxData.map(f => f.kwh);
  const maxKwh = Math.max(...kwhValues);
  const minKwh = Math.min(...kwhValues);

  const strokeScale = d3.scaleLinear()
    .domain([Math.max(0.1, minKwh), Math.max(1, maxKwh)])
    .range([2, 8]);

  function getFluxColor(d: FluxData) {
    if(d.source === "PV") return "#8B5CF6"; // Vibrant purple for solar energy
    if(d.source === "RESEAU") return "#0EA5E9"; // Ocean blue for grid
    return "#888";
  }

  // Créer les chemins de flux
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

  // Fonction d'animation des flux
  function animateFlux() {
    fluxPaths
      .transition()
      .duration(1500)
      .ease(d3.easeLinear)
      .attrTween("stroke-dashoffset", () => d3.interpolate(0, -16) as any)
      .on("end", animateFlux);
  }
  animateFlux();

  // Ajouter les étiquettes de flux
  svg.selectAll(".flux-label")
    .data(fluxData)
    .enter()
    .append("text")
    .attr("class", "flux-label")
    .attr("font-size", 12)
    .attr("fill", "#555")
    .attr("text-anchor", "middle")
    .each(function(d: FluxData) {
      const s = centers[d.source as keyof typeof centers];
      const t = centers[d.target as keyof typeof centers];
      const mx = (s.x + t.x) / 2;
      const my = (s.y + t.y) / 2 + 20; // Positionner en dessous du flux
      d3.select(this)
        .attr("x", mx)
        .attr("y", my)
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
  // Définir les arcs pour les donuts
  const arcBg = d3.arc()
    .innerRadius(outerRadius - thickness)
    .outerRadius(outerRadius)
    .startAngle(0)
    .endAngle(2 * Math.PI);

  const arcValue = d3.arc()
    .innerRadius(outerRadius - thickness)
    .outerRadius(outerRadius)
    .startAngle(0);

  // Créer les groupes de donuts
  const donutGroup = svg.selectAll(".donut")
    .data(donutsData)
    .enter()
    .append("g")
    .attr("class", "donut")
    .attr("transform", (d: DonutData) => {
      const c = centers[d.id as keyof typeof centers];
      return `translate(${c.x}, ${c.y})`;
    });

  // Ajouter les fonds des donuts
  donutGroup.append("path")
    .attr("d", arcBg({} as any) as string)
    .attr("fill", "#eee");

  // Ajouter les valeurs des donuts
  donutGroup.each(function(d: DonutData) {
    if(d.id === "MAISON") {
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
    } else {
      let fillColor = "";
      if(d.id === "PV") {
        fillColor = "#66BB6A";
      }
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
  });

  // Ajouter le texte de pourcentage - centré avec text-anchor="middle"
  donutGroup.append("text")
    .attr("fill", "#555")
    .attr("font-size", 16)
    .attr("text-anchor", "middle") // Assure que le texte est centré
    .attr("dy", -5)
    .text((d: DonutData) => {
      if (d.id === "PV" || d.id === "MAISON") {
        return `${Math.round(d.ratio * 100)} %`;
      } else {
        return "";
      }
    });

  // Ajouter le texte du total kWh - centré avec text-anchor="middle"
  donutGroup.append("text")
    .attr("fill", "#555")
    .attr("font-size", 14)
    .attr("text-anchor", "middle") // Assure que le texte est centré
    .attr("dy", 15)
    .text((d: DonutData) => {
      if (d.id === "PV" || d.id === "MAISON") {
        return `${d.totalKwh.toFixed(1)} kWh`;
      } else {
        return "";
      }
    });
}

export function createIcons(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  centers: Record<string, Center>
) {
  // Modern icon for PV (Solar panel)
  const pvGroup = svg.append("g")
    .attr("transform", `translate(${centers.PV.x}, ${centers.PV.y - 90})`);
  
  // Background circle for the icon
  pvGroup.append("circle")
    .attr("r", 30)
    .attr("fill", "rgba(139, 92, 246, 0.1)") // Light purple background
    .attr("stroke", "#8B5CF6")
    .attr("stroke-width", 2);
  
  // Use SVG path data from Lucide Sun icon
  pvGroup.append("g")
    .attr("transform", "translate(-12, -12) scale(1)")
    .html(iconToSvgString(Sun, {
      color: "#8B5CF6", // Vibrant purple
      size: 24,
      strokeWidth: 2
    }));

  // Modern icon for MAISON (House)
  const houseGroup = svg.append("g")
    .attr("transform", `translate(${centers.MAISON.x}, ${centers.MAISON.y - 90})`);
  
  // Background circle for the icon
  houseGroup.append("circle")
    .attr("r", 30)
    .attr("fill", "rgba(14, 165, 233, 0.1)") // Light blue background
    .attr("stroke", "#0EA5E9")
    .attr("stroke-width", 2);
  
  // Use SVG path data from Lucide Home icon
  houseGroup.append("g")
    .attr("transform", "translate(-12, -12) scale(1)")
    .html(iconToSvgString(Home, {
      color: "#0EA5E9", // Ocean blue
      size: 24,
      strokeWidth: 2
    }));

  // Modern icon for RESEAU (Network/Grid)
  const reseauGroup = svg.append("g")
    .attr("transform", `translate(${centers.RESEAU.x}, ${centers.RESEAU.y - 90})`);
  
  // Background circle for the icon
  reseauGroup.append("circle")
    .attr("r", 30)
    .attr("fill", "rgba(26, 31, 44, 0.1)") // Light dark-purple background
    .attr("stroke", "#1A1F2C")
    .attr("stroke-width", 2);
  
  // Use SVG path data from Lucide Network icon
  reseauGroup.append("g")
    .attr("transform", "translate(-12, -12) scale(1)")
    .html(iconToSvgString(Network, {
      color: "#1A1F2C", // Dark purple
      size: 24,
      strokeWidth: 2
    }));
}

// Helper function to convert Lucide icon to SVG string
function iconToSvgString(
  LucideIcon: any, 
  props: { color: string; size: number; strokeWidth: number }
) {
  // Create a temporary DOM element
  const temp = document.createElement('div');
  
  // Get the icon's SVG string representation
  const iconSvg = LucideIcon({
    color: props.color,
    size: props.size,
    strokeWidth: props.strokeWidth,
  }).props.children.props.children;
  
  // Return only the path data without the SVG wrapper
  return iconSvg;
}

export function createReseauGroup(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  center: Center,
  gridImportTotal: number,
  gridExportTotal: number
) {
  // Ajouter le groupe pour le pylône électrique
  const reseauGroup = svg.append("g")
    .attr("transform", `translate(${center.x}, ${center.y - 30})`);

  // Dessiner un pylône électrique simplifié
  reseauGroup.append("path")
    .attr("d", `
      M-10,30 L-10,0 L-20,-20 L20,-20 L10,0 L10,30 Z
      M-20,-20 L-30,-30 M20,-20 L30,-30
      M-15,-10 L15,-10
    `)
    .attr("stroke", "#42A5F5")
    .attr("stroke-width", 2)
    .attr("fill", "none");

  // Ajouter les flèches et les valeurs pour l'importation
  reseauGroup.append("text")
    .attr("class", "arrow")
    .attr("x", 0)
    .attr("y", 50)
    .attr("text-anchor", "middle")
    .attr("fill", "#42A5F5")
    .attr("font-size", 18)
    .attr("font-weight", "bold")
    .text("→");

  reseauGroup.append("text")
    .attr("x", 40)
    .attr("y", 50)
    .attr("fill", "#42A5F5")
    .attr("font-size", 14)
    .text(`${gridImportTotal.toFixed(1)} kWh`);

  // Ajouter les flèches et les valeurs pour l'exportation
  reseauGroup.append("text")
    .attr("class", "arrow")
    .attr("x", 0)
    .attr("y", 70)
    .attr("text-anchor", "middle")
    .attr("fill", "#388E3C")
    .attr("font-size", 18)
    .attr("font-weight", "bold")
    .text("←");

  reseauGroup.append("text")
    .attr("x", 40)
    .attr("y", 70)
    .attr("fill", "#388E3C")
    .attr("font-size", 14)
    .text(`${gridExportTotal.toFixed(1)} kWh`);
}
