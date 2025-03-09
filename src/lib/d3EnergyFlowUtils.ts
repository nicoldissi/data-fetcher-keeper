
import * as d3 from 'd3';

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
  // Create improved Solar Panel icon for PV
  const solarPanel = svg.append("g")
    .attr("transform", `translate(${centers.PV.x}, ${centers.PV.y - 90})`)
    .attr("fill", "#66BB6A");
  
  // Main panel frame
  solarPanel.append("rect")
    .attr("x", -20)
    .attr("y", -18)
    .attr("width", 40)
    .attr("height", 30)
    .attr("rx", 2)
    .attr("stroke", "#2E7D32")
    .attr("stroke-width", 1.5)
    .attr("fill", "#66BB6A");
  
  // Solar cells
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      solarPanel.append("rect")
        .attr("x", -17 + col * 9)
        .attr("y", -15 + row * 8)
        .attr("width", 7)
        .attr("height", 6)
        .attr("rx", 1)
        .attr("fill", "#43A047")
        .attr("stroke", "#2E7D32")
        .attr("stroke-width", 0.5);
    }
  }
  
  // Support stand
  solarPanel.append("path")
    .attr("d", "M-5,12 L5,12 L5,25 L-5,25 Z")
    .attr("fill", "#4CAF50")
    .attr("stroke", "#2E7D32")
    .attr("stroke-width", 1);

  // Improved House icon for MAISON
  const houseGroup = svg.append("g")
    .attr("transform", `translate(${centers.MAISON.x}, ${centers.MAISON.y - 90})`)
    .attr("fill", "#FFA500");
  
  // Roof
  houseGroup.append("path")
    .attr("d", "M-20,2 L0,-18 L20,2 Z")
    .attr("fill", "#E65100")
    .attr("stroke", "#BF360C")
    .attr("stroke-width", 1.5);
  
  // House body
  houseGroup.append("rect")
    .attr("x", -15)
    .attr("y", 2)
    .attr("width", 30)
    .attr("height", 22)
    .attr("fill", "#FFB74D")
    .attr("stroke", "#E65100")
    .attr("stroke-width", 1.5);
  
  // Door
  houseGroup.append("rect")
    .attr("x", -4)
    .attr("y", 14)
    .attr("width", 8)
    .attr("height", 10)
    .attr("rx", 1)
    .attr("fill", "#5D4037")
    .attr("stroke", "#3E2723")
    .attr("stroke-width", 1);
  
  // Door knob
  houseGroup.append("circle")
    .attr("cx", 2)
    .attr("cy", 19)
    .attr("r", 1)
    .attr("fill", "#FFC107");
  
  // Left window
  houseGroup.append("rect")
    .attr("x", -12)
    .attr("y", 6)
    .attr("width", 6)
    .attr("height", 6)
    .attr("fill", "#BBDEFB")
    .attr("stroke", "#1976D2")
    .attr("stroke-width", 1);
  
  // Window cross
  houseGroup.append("path")
    .attr("d", "M-9,6 V12 M-12,9 H-6")
    .attr("stroke", "#1976D2")
    .attr("stroke-width", 1);
  
  // Right window
  houseGroup.append("rect")
    .attr("x", 6)
    .attr("y", 6)
    .attr("width", 6)
    .attr("height", 6)
    .attr("fill", "#BBDEFB")
    .attr("stroke", "#1976D2")
    .attr("stroke-width", 1);
  
  // Window cross
  houseGroup.append("path")
    .attr("d", "M9,6 V12 M6,9 H12")
    .attr("stroke", "#1976D2")
    .attr("stroke-width", 1);

  // Improved Electricity pylon for RESEAU
  const pylonGroup = svg.append("g")
    .attr("transform", `translate(${centers.RESEAU.x}, ${centers.RESEAU.y - 90})`)
    .attr("fill", "none")
    .attr("stroke", "#42A5F5")
    .attr("stroke-width", 1.5);
  
  // Main structure
  pylonGroup.append("path")
    .attr("d", `
      M-14,25 L-7,0 L-15,-15 L15,-15 L7,0 L14,25
      M-15,-15 L15,-15
      M-7,0 L7,0
      M-14,25 L14,25
    `)
    .attr("stroke", "#1976D2")
    .attr("stroke-width", 2);
  
  // Cross supports
  pylonGroup.append("path")
    .attr("d", `
      M-11,-7 L11,-7
      M-10,8 L10,8
      M-12,16 L12,16
    `)
    .attr("stroke", "#1976D2");
  
  // Power lines
  pylonGroup.append("path")
    .attr("d", `
      M-15,-15 L-25,-20 M15,-15 L25,-20
      M-14,25 L-24,30 M14,25 L24,30
    `)
    .attr("stroke", "#42A5F5")
    .attr("stroke-dasharray", "3,2");
  
  // Insulators
  for (let i = -10; i <= 10; i += 10) {
    pylonGroup.append("circle")
      .attr("cx", i)
      .attr("cy", -15)
      .attr("r", 2)
      .attr("fill", "#90CAF9");
  }
  
  for (let i = -10; i <= 10; i += 10) {
    pylonGroup.append("circle")
      .attr("cx", i * 0.9)
      .attr("cy", 25)
      .attr("r", 2)
      .attr("fill", "#90CAF9");
  }
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
