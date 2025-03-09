import * as d3 from 'd3';
import { HousePlug, Sun, Zap } from 'lucide-react';
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
    if(d.source === "PV") return "#66BB6A";
    if(d.source === "RESEAU") return "#42A5F5";
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

  // Ajouter les icônes au-dessus des jauges
  donutGroup.each(function(d: DonutData) {
    // Position de l'icône au-dessus du donut
    const iconY = -(outerRadius + 30);
    
    // Créer un conteneur pour l'icône
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
    
    // Rendre l'icône appropriée
    if (d.id === "PV") {
      ReactDOM.render(
        React.createElement(Sun, { size: 24, color: "#66BB6A", strokeWidth: 2 }),
        container
      );
    } else if (d.id === "MAISON") {
      ReactDOM.render(
        React.createElement(HousePlug, { size: 24, color: "#6366f1", strokeWidth: 2 }),
        container
      );
    }
  });

  // Ajouter le texte de pourcentage - centré avec text-anchor="middle"
  donutGroup.append("text")
    .attr("fill", "#555")
    .attr("font-size", 16)
    .attr("text-anchor", "middle") 
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
    .attr("text-anchor", "middle")
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
  // Ajouter uniquement l'icône pour le réseau sans cercle
  const reseauContainer = document.createElement('div');
  reseauContainer.style.display = 'flex';
  reseauContainer.style.justifyContent = 'center';
  reseauContainer.style.alignItems = 'center';
  reseauContainer.style.width = '100%';
  reseauContainer.style.height = '100%';
  
  // Créer un groupe pour l'icône du réseau
  const reseauGroup = svg.append("g")
    .attr("transform", `translate(${centers.RESEAU.x}, ${centers.RESEAU.y - 90})`);
  
  // Ajouter un foreignObject pour contenir l'icône React
  const reseauForeign = reseauGroup.append("foreignObject")
    .attr("width", 60)
    .attr("height", 60)
    .attr("x", -30)
    .attr("y", -30);
  
  reseauForeign.node()?.appendChild(reseauContainer);
  
  // Rendre l'icône du réseau
  ReactDOM.render(
    React.createElement(Zap, { size: 32, color: "#42A5F5", strokeWidth: 2 }),
    reseauContainer
  );
}

export function createReseauGroup(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  center: Center,
  gridImportTotal: number,
  gridExportTotal: number
) {
  // Ajouter le groupe pour le réseau (sans pylône électrique)
  const reseauGroup = svg.append("g")
    .attr("transform", `translate(${center.x}, ${center.y - 30})`);

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
