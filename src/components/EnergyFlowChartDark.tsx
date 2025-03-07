import { useEffect, useRef } from 'react'
import { ShellyEMData } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface EnergyFlowChartDarkProps {
  data: ShellyEMData | null
  className?: string
}

export function EnergyFlowChartDark({ data, className }: EnergyFlowChartDarkProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  
  useEffect(() => {
    // Only run effect when we have both data and SVG ref
    if (!data || !svgRef.current) {
      // Reduce log noise during initialization
      return;
    }
  
    // Ajout de logs pour déboguer
    console.log('EnergyFlowChartDark received new data:', data)
    console.log('Grid power:', data.power, 'W', typeof data.power)
    console.log('Solar power:', data.production_power, 'W', typeof data.production_power)
    console.log('Home consumption:', data.power + data.production_power, 'W')
  
    // Récupère les valeurs de puissance
    const gridFlow = data.power
    const solarFlow = data.production_power
    const homeConsumption = Math.abs(solarFlow) + Math.abs(gridFlow)
    
    console.log('Calculated values:', { gridFlow, solarFlow, homeConsumption })
  
    // Sélectionne les chemins
    const gridToHomePath = svgRef.current.querySelector('#gridToHomePath') as SVGPathElement | null
    const gridFromHomePath = svgRef.current.querySelector('#gridFromHomePath') as SVGPathElement | null
    const solarToHomePath = svgRef.current.querySelector('#solarToHomePath') as SVGPathElement | null
    const solarToGridPath = svgRef.current.querySelector('#solarToGridPath') as SVGPathElement | null
    
    console.log('SVG paths found:', { 
      gridToHomePath: !!gridToHomePath, 
      gridFromHomePath: !!gridFromHomePath, 
      solarToHomePath: !!solarToHomePath, 
      solarToGridPath: !!solarToGridPath 
    })
  
    if (gridToHomePath && gridFromHomePath && solarToHomePath && solarToGridPath) {
      // Fonction utilitaire pour ajuster la durée d'animation
      const getAnimationDuration = (power: number) => {
        const absValue = Math.abs(power)
        return Math.max(2, Math.min(10, 20000 / (absValue + 100)))
      }
  
      // Détermine les scénarios de flux d'énergie
      const isPVProducing = solarFlow > 6 // Seuil minimal pour considérer la production
      const isGridSupplyingHome = gridFlow > 0
      const isGridReceivingExcess = gridFlow < 0
      
      console.log('Flow scenarios:', { isPVProducing, isGridSupplyingHome, isGridReceivingExcess })
  
      // Gestion des chemins et animations en fonction des scénarios
      
      // 1. Flux du réseau vers la maison (consommation depuis le réseau)
      if (isGridSupplyingHome) {
        gridToHomePath.style.display = 'block'
        gridToHomePath.style.animation = `flowAnimation ${getAnimationDuration(gridFlow)}s linear infinite`
        gridToHomePath.setAttribute('stroke', '#ef4444') // Rouge pour consommation depuis le réseau
        console.log('Grid to home flow active with duration:', getAnimationDuration(gridFlow))
      } else {
        gridToHomePath.style.display = 'none'
        console.log('Grid to home flow inactive')
      }
  
      // 2. Flux de la maison vers le réseau (injection vers le réseau)
      if (isGridReceivingExcess) {
        gridFromHomePath.style.display = 'block'
        gridFromHomePath.style.animation = `flowAnimation ${getAnimationDuration(Math.abs(gridFlow))}s linear infinite`
        gridFromHomePath.setAttribute('stroke', '#10b981') // Vert pour injection vers le réseau
        console.log('Grid from home flow active with duration:', getAnimationDuration(Math.abs(gridFlow)))
      } else {
        gridFromHomePath.style.display = 'none'
        console.log('Grid from home flow inactive')
      }
  
      // 3. Flux du PV vers la maison (toujours présent si production)
      if (isPVProducing) {
        solarToHomePath.style.display = 'block'
        solarToHomePath.style.animation = `flowAnimation ${getAnimationDuration(Math.min(solarFlow, homeConsumption))}s linear infinite`
        solarToHomePath.setAttribute('stroke', '#10b981') // Vert pour production solaire
        console.log('Solar to home flow active with duration:', getAnimationDuration(Math.min(solarFlow, homeConsumption)))
      } else {
        solarToHomePath.style.display = 'none'
        console.log('Solar to home flow inactive')
      }
  
      // 4. Flux du PV vers le réseau (excédent de production)
      if (isPVProducing && isGridReceivingExcess) {
        solarToGridPath.style.display = 'block'
        solarToGridPath.style.animation = `flowAnimation ${getAnimationDuration(Math.abs(gridFlow))}s linear infinite`
        solarToGridPath.setAttribute('stroke', '#10b981') // Vert pour production solaire
        console.log('Solar to grid flow active with duration:', getAnimationDuration(Math.abs(gridFlow)))
      } else {
        solarToGridPath.style.display = 'none'
        console.log('Solar to grid flow inactive')
      }
    }
  }, [data])
  // If no data is available, show a loading or placeholder state
  if (!data) {
    return (
      <Card className={cn("overflow-hidden backdrop-blur-sm bg-white/90 border-0 shadow-md", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center">
            <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded mr-2">TEMPS RÉEL</span>
            Flux d'Énergie
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6 min-h-[300px]">
          <div className="text-center text-muted-foreground">
            <p>En attente de données...</p>
            <p className="text-sm">Les données seront affichées dès qu'elles seront disponibles.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={cn("overflow-hidden backdrop-blur-sm bg-white/90 border-0 shadow-md", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center">
          <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded mr-2">TEMPS RÉEL</span>
          Flux d'Énergie
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center p-6">
        <div className="relative w-full max-w-md aspect-square">
          <svg
            ref={svgRef}
            viewBox="0 0 400 400"
            className="w-full h-full"
          >
            <defs>
              {/* Les filtres « neon » pour l'effet lumineux */}
              <filter id="neonGrid" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                <feColorMatrix in="blur" type="matrix"
                    values="1 0 0 0 0.961   0 1 0 0 0.620   0 0 1 0 0.043  0 0 0 3 0"
                />
              </filter>
              <filter id="neonSolar" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                <feColorMatrix in="blur" type="matrix"
                  values="1 0 0 0 0.961   0 1 0 0 0.620   0 0 1 0 0.043  0 0 0 3 0"
                />
              </filter>
              <filter id="neonHome" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                <feColorMatrix in="blur" type="matrix"
                  values="1 0 0 0 0.388   0 1 0 0 0.400   0 0 1 0 0.945  0 0 0 3 0"
                />
              </filter>
            </defs>

            <style>
              {`
                @keyframes flowAnimation {
                  0% { stroke-dashoffset: 1000; }
                  100% { stroke-dashoffset: 0; }
                }
                .flow-path {
                  stroke-width: 3;
                  stroke-dasharray: 10, 5;
                  stroke-linecap: round;
                  stroke-linejoin: round;
                  fill: none;
                  marker-end: url(#arrowhead);
                }

                .node-circle {
                  fill: white;
                  stroke-width: 2;
                }
                .node-text {
                  font-size: 14px;
                  font-weight: 500;
                  text-anchor: middle;
                  dominant-baseline: middle;
                }
                .power-text {
                  font-size: 12px;
                  font-weight: 400;
                  text-anchor: middle;
                  dominant-baseline: middle;
                }
              `}
            </style>

            {/* Grid Node */}
            <g transform="translate(50, 200)">
            <circle className="node-circle" cx="0" cy="0" r="40" stroke="#94a3b8" filter="url(#neonGrid)" />
              <circle className="node-circle" cx="0" cy="0" r="40" stroke="#94a3b8" />
              <text className="node-text" fill="#64748b">Réseau</text>
              <text className="power-text" y="20" fill="#64748b">
                {data ? `${data.power.toFixed(1)} W` : '0 W'}
              </text>
            </g>

            {/* Solar Node */}
            <g transform="translate(200, 50)">
              <circle className="node-circle" cx="0" cy="0" r="40" stroke="#f59e0b" filter="url(#neonSolar)" />
              <circle className="node-circle" cx="0" cy="0" r="40" stroke="#f59e0b" />
              <text className="node-text" fill="#d97706">PV</text>
              <text className="power-text" y="20" fill="#d97706">
                {data ? `${data.production_power.toFixed(1)} W` : '0 W'}
              </text>
            </g>

            {/* Home Node */}
            <g transform="translate(350, 200)">
              <circle className="node-circle" cx="0" cy="0" r="40" stroke="#6366f1" filter="url(#neonHome)" />
              <circle className="node-circle" cx="0" cy="0" r="40" stroke="#6366f1" />
              <text className="node-text" fill="#4f46e5">Maison</text>
              <text className="power-text" y="20" fill="#4f46e5">
                {data ? `${(data.power + data.production_power).toFixed(1)} W` : '0 W'}
              </text>
            </g>

            {/* Flow Paths avec différentes directions selon les scénarios */}
            {/* 1. Du réseau vers la maison (consommation) */}
            <path
              id="gridToHomePath"
              className="flow-path"
              d="M 90,200 C 170,200 230,200 310,200"
              stroke="#ef4444"
            />
            
            {/* 2. De la maison vers le réseau (injection) */}
            <path
              id="gridFromHomePath"
              className="flow-path"
              d="M 310,200 C 230,200 170,200 90,200"
              stroke="#10b981"
            />
            
            {/* 3. Du PV vers la maison (consommation directe) */}
            <path
              id="solarToHomePath"
              className="flow-path"
              d="M 200,90 M 200,90 C 200,130 250,170 280,180 C 300,190 320,200 310,200"
              stroke="#10b981"
            />
            
            {/* 4. Du PV vers le réseau (excédent) */}
            <path
              id="solarToGridPath"
              className="flow-path"
              d="M 200,90 C 200,130 150,170 120,180 C 100,190 80,200 90,200"
              stroke="#10b981"
            />
          </svg>
        </div>
      </CardContent>
    </Card>
  )
}
