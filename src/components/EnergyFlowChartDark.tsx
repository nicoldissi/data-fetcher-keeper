import { useEffect, useRef, useState } from 'react'
import { ShellyEMData } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatLocalDate, parseToLocalDate } from '@/lib/dateUtils'
import * as d3 from 'd3'

interface EnergyFlowChartDarkProps {
  data: ShellyEMData | null
  className?: string
}

interface FlowAnimationState {
  gridToHome: boolean
  gridFromHome: boolean
  solarToHome: boolean
  solarToGrid: boolean
}

interface NodePosition {
  x: number
  y: number
  label: string
  value: string
  color: string
}

export function EnergyFlowChartDark({ data, className }: EnergyFlowChartDarkProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 400, height: 400 })
  const [flowAnimations, setFlowAnimations] = useState<FlowAnimationState>({
    gridToHome: false,
    gridFromHome: false,
    solarToHome: false,
    solarToGrid: false
  })
  
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { offsetWidth } = containerRef.current
        setSize({
          width: offsetWidth,
          height: Math.min(400, offsetWidth)
        })
      }
    }
    
    updateSize()
    window.addEventListener('resize', updateSize)
    
    return () => {
      window.removeEventListener('resize', updateSize)
    }
  }, [])
  
  useEffect(() => {
    if (!data) return
    
    console.log('EnergyFlowChartDark received new data:', data)
    
    const localDate = parseToLocalDate(data.timestamp)
    const formattedTime = formatLocalDate(data.timestamp)
    
    console.log('Converted timestamp:', formattedTime)
    
    const isPVProducing = data.production_power > 6
    const isGridSupplyingHome = data.power > 0
    const isGridReceivingExcess = data.power < 0
    
    setFlowAnimations({
      gridToHome: isGridSupplyingHome,
      gridFromHome: isGridReceivingExcess,
      solarToHome: isPVProducing,
      solarToGrid: isPVProducing && isGridReceivingExcess
    })
    
  }, [data])
  
  useEffect(() => {
    if (!svgRef.current || !data) return
    
    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()
    
    const { width, height } = size
    const nodeRadius = 40
    
    const nodes = {
      grid: {
        x: width * 0.2,
        y: height * 0.5,
        label: 'Réseau',
        value: `${data.power.toFixed(1)} W`,
        color: '#94a3b8'
      },
      solar: {
        x: width * 0.5,
        y: height * 0.2,
        label: 'PV',
        value: `${data.production_power.toFixed(1)} W`,
        color: '#f59e0b'
      },
      home: {
        x: width * 0.8,
        y: height * 0.5,
        label: 'Maison',
        value: `${(data.power + data.production_power).toFixed(1)} W`,
        color: '#6366f1'
      }
    }
    
    Object.entries(nodes).forEach(([key, node]) => {
      const nodeGroup = svg.append('g')
        .attr('transform', `translate(${node.x}, ${node.y})`)
        .attr('class', `node-${key}`)
      
      nodeGroup.append('circle')
        .attr('r', nodeRadius)
        .attr('fill', 'white')
        .attr('stroke', node.color)
        .attr('stroke-width', 2)
        .style('filter', 'drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.1))')
      
      nodeGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0em')
        .attr('fill', key === 'grid' ? '#64748b' : (key === 'solar' ? '#d97706' : '#4f46e5'))
        .attr('font-weight', 'bold')
        .text(node.label)
      
      nodeGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.5em')
        .attr('fill', key === 'grid' ? '#64748b' : (key === 'solar' ? '#d97706' : '#4f46e5'))
        .attr('font-size', '12px')
        .text(node.value)
    })
    
    const arrowPaths = {
      gridToHome: {
        path: createCurvedPath(
          nodes.grid.x + nodeRadius, nodes.grid.y - 10,
          nodes.home.x - nodeRadius, nodes.home.y - 10,
          0.3, -20
        ),
        active: flowAnimations.gridToHome,
        color: '#ef4444'
      },
      gridFromHome: {
        path: createCurvedPath(
          nodes.home.x - nodeRadius, nodes.home.y + 10,
          nodes.grid.x + nodeRadius, nodes.grid.y + 10,
          0.3, 20
        ),
        active: flowAnimations.gridFromHome,
        color: '#10b981'
      },
      solarToHome: {
        path: createCurvedPath(
          nodes.solar.x + 15, nodes.solar.y + nodeRadius,
          nodes.home.x - nodeRadius, nodes.home.y - 20,
          0.5, 0
        ),
        active: flowAnimations.solarToHome,
        color: '#f59e0b'
      },
      solarToGrid: {
        path: createCurvedPath(
          nodes.solar.x - 15, nodes.solar.y + nodeRadius,
          nodes.grid.x + nodeRadius, nodes.grid.y - 20,
          0.5, 0
        ),
        active: flowAnimations.solarToGrid,
        color: '#10b981'
      }
    }
    
    function createCurvedPath(
      x1: number, y1: number, 
      x2: number, y2: number, 
      curvature: number,
      heightOffset: number
    ) {
      const midX = (x1 + x2) / 2
      const midY = (y1 + y2) / 2 + heightOffset
      return `M${x1},${y1} Q${midX},${midY} ${x2},${y2}`
    }
    
    const colors = ['#ef4444', '#10b981', '#f59e0b']
    const defs = svg.append('defs')
    
    colors.forEach(color => {
      const markerId = `arrowMarker-${color.substring(1)}`
      defs.append('marker')
        .attr('id', markerId)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 8)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', color)
    })
    
    Object.entries(arrowPaths).forEach(([key, arrow]) => {
      const path = svg.append('path')
        .attr('d', arrow.path)
        .attr('fill', 'none')
        .attr('stroke', arrow.color)
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', '10,5')
        .attr('marker-end', `url(#arrowMarker-${arrow.color.substring(1)})`)
        .attr('opacity', arrow.active ? 1 : 0)
        .style('filter', `drop-shadow(0px 2px 3px ${arrow.color}80)`)
      
      if (arrow.active) {
        function animateDash() {
          path.transition()
            .duration(500)
            .ease(d3.easeLinear)
            .attrTween('stroke-dashoffset', function() {
              const length = (this as SVGPathElement).getTotalLength()
              return function(t) {
                return String(length * (1 - t))
              }
            })
            .on('end', animateDash)
        }
        
        animateDash()
      }
    })
    
  }, [data, flowAnimations, size])
  
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
        <div 
          ref={containerRef} 
          className="relative w-full max-w-md aspect-square"
        >
          <svg 
            ref={svgRef} 
            width={size.width} 
            height={size.height} 
            className="overflow-visible"
          />
        </div>
      </CardContent>
    </Card>
  )
}
