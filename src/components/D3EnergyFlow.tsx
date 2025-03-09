
import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useDailyEnergyTotals } from '@/hooks/useDailyEnergyTotals';
import * as d3 from 'd3';

interface D3EnergyFlowProps {
  configId?: string;
  className?: string;
}

export function D3EnergyFlow({ configId, className }: D3EnergyFlowProps) {
  const { dailyTotals, loading } = useDailyEnergyTotals(configId);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isClient, setIsClient] = useState(false);

  // Utiliser useEffect pour s'assurer que le code s'exécute uniquement côté client
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || loading || !svgRef.current) return;

    // Préparer les données pour les donuts
    const pvTotal = dailyTotals.production;
    const gridImportTotal = dailyTotals.consumption - (dailyTotals.production - dailyTotals.injection);
    const gridExportTotal = dailyTotals.injection;
    const consumptionTotal = dailyTotals.consumption;
    
    const pvToHome = pvTotal - gridExportTotal;
    const pvToHomeRatio = pvTotal > 0 ? pvToHome / pvTotal : 0;
    const homeFromPvRatio = consumptionTotal > 0 ? pvToHome / consumptionTotal : 0;

    const donutsData = [
      { id: "PV", label: "Photovoltaïque", totalKwh: pvTotal, ratio: pvToHomeRatio },
      { id: "MAISON", label: "Maison", totalKwh: consumptionTotal, ratio: homeFromPvRatio }
    ];

    const fluxData = [
      { source: "PV", target: "MAISON", kwh: pvToHome },
      { source: "PV", target: "RESEAU", kwh: gridExportTotal },
      { source: "RESEAU", target: "MAISON", kwh: gridImportTotal }
    ];

    // Nettoyer le SVG existant
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Appliquer les dimensions
    const svgWidth = 700;
    const svgHeight = 500;
    svg.attr("width", svgWidth)
       .attr("height", svgHeight)
       .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
       .attr("preserveAspectRatio", "xMidYMid meet");

    // Créer les définitions pour les effets
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

    // Définir les positions des centres
    const centers = {
      PV:     { x: svgWidth / 2,        y: 120 },
      RESEAU: { x: svgWidth / 2 - 180,  y: 380 },
      MAISON: { x: svgWidth / 2 + 180,  y: 380 }
    };

    // Définir les dimensions des donuts
    const outerRadius = 60;
    const thickness = 12;

    // Échelle pour les largeurs de traits des flux
    const kwhValues = fluxData.map(f => f.kwh);
    const maxKwh = Math.max(...kwhValues);
    const minKwh = Math.min(...kwhValues);

    const strokeScale = d3.scaleLinear()
      .domain([Math.max(0.1, minKwh), Math.max(1, maxKwh)])
      .range([2, 8]);

    function getFluxColor(d: any) {
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
      .attr("d", (d: any) => {
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
      .each(function(d: any) {
        const s = centers[d.source as keyof typeof centers];
        const t = centers[d.target as keyof typeof centers];
        const mx = (s.x + t.x) / 2;
        const my = (s.y + t.y) / 2 + 20; // Positionner en dessous du flux
        d3.select(this)
          .attr("x", mx)
          .attr("y", my)
          .text(`${d.kwh.toFixed(1)} kWh`);
      });

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
      .attr("transform", (d: any) => {
        const c = centers[d.id as keyof typeof centers];
        return `translate(${c.x}, ${c.y})`;
      });

    // Ajouter les fonds des donuts
    donutGroup.append("path")
      .attr("d", arcBg as any)
      .attr("fill", "#eee");

    // Ajouter les valeurs des donuts
    donutGroup.each(function(d: any) {
      if(d.id === "MAISON") {
        d3.select(this).append("path")
          .attr("class", "arc-pv")
          .attr("fill", "#66BB6A")
          .transition()
          .duration(800)
          .attrTween("d", function() {
            const interpolate = d3.interpolate(0, d.ratio * 2 * Math.PI);
            return (t: number) => {
              // Fix: Make sure to pass all required arguments to the arc function
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
              // Fix: Make sure to pass all required arguments to the arc function
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
              // Fix: Make sure to pass all required arguments to the arc function
              return (arcValue as any).endAngle(interpolate(t))({} as any) as string;
            };
          });
      }
    });

    // Ajouter le texte de pourcentage
    donutGroup.append("text")
      .attr("fill", "#555")
      .attr("font-size", 16)
      .attr("dy", -5)
      .text((d: any) => {
        if (d.id === "PV" || d.id === "MAISON") {
          return `${Math.round(d.ratio * 100)} %`;
        } else {
          return "";
        }
      });

    // Ajouter le texte du total kWh
    donutGroup.append("text")
      .attr("fill", "#555")
      .attr("font-size", 14)
      .attr("dy", 15)
      .text((d: any) => {
        if (d.id === "PV" || d.id === "MAISON") {
          return `${d.totalKwh.toFixed(1)} kWh`;
        } else {
          return "";
        }
      });

    // Ajouter les icônes
    donutGroup.each(function(d: any) {
      // Ajout des icônes (soleil ou maison)
      if (d.id === "PV") {
        d3.select(this)
          .append("circle")
          .attr("r", 12)
          .attr("cy", -outerRadius - 20)
          .attr("fill", "#f9d71c")
          .attr("stroke", "#e9b31a")
          .attr("stroke-width", 1);
          
        // Rayons du soleil
        const numRays = 8;
        for (let i = 0; i < numRays; i++) {
          const angle = (i / numRays) * Math.PI * 2;
          const x1 = Math.sin(angle) * 15;
          const y1 = -outerRadius - 20 + Math.cos(angle) * 15;
          const x2 = Math.sin(angle) * 22;
          const y2 = -outerRadius - 20 + Math.cos(angle) * 22;
          
          d3.select(this)
            .append("line")
            .attr("x1", x1)
            .attr("y1", y1)
            .attr("x2", x2)
            .attr("y2", y2)
            .attr("stroke", "#f9d71c")
            .attr("stroke-width", 2);
        }
      } else if (d.id === "MAISON") {
        // Dessiner une maison
        const houseGroup = d3.select(this).append("g")
          .attr("transform", `translate(0, ${-outerRadius - 20})`);
        
        // Toit
        houseGroup.append("path")
          .attr("d", "M-15,0 L0,-15 L15,0 Z")
          .attr("fill", "#FFA500");
        
        // Corps de la maison
        houseGroup.append("rect")
          .attr("x", -12)
          .attr("y", 0)
          .attr("width", 24)
          .attr("height", 18)
          .attr("fill", "#FFA500");
        
        // Porte
        houseGroup.append("rect")
          .attr("x", -4)
          .attr("y", 10)
          .attr("width", 8)
          .attr("height", 8)
          .attr("fill", "#7E5109");
        
        // Fenêtre
        houseGroup.append("rect")
          .attr("x", -9)
          .attr("y", 3)
          .attr("width", 6)
          .attr("height", 6)
          .attr("fill", "#87CEEB");
      }
    });

    // Ajouter le groupe pour le pylône électrique
    const reseauGroup = svg.append("g")
      .attr("transform", `translate(${centers.RESEAU.x}, ${centers.RESEAU.y - 30})`);

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

    // Ajouter un titre
    svg.append("text")
      .attr("x", svgWidth / 2)
      .attr("y", 40)
      .attr("text-anchor", "middle")
      .attr("font-size", 18)
      .attr("font-weight", "bold")
      .attr("fill", "#555")
      .text("Bilan Énergétique Journalier");

  }, [dailyTotals, loading, isClient]);

  if (loading) {
    return (
      <Card className={cn("overflow-hidden backdrop-blur-sm bg-white/90 border-0 shadow-md", className)}>
        <CardContent className="p-6">
          <div className="h-[500px] flex items-center justify-center">
            <p className="text-gray-500">Chargement des données journalières...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden backdrop-blur-sm bg-white/90 border-0 shadow-md", className)}>
      <CardContent className="p-6">
        <div className="flex justify-center">
          <svg ref={svgRef} width="700" height="500" className="max-w-full"></svg>
        </div>
      </CardContent>
    </Card>
  );
}
