
import { useEffect, useRef, useState } from 'react'
import { ShellyEMData } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatLocalDate, parseToLocalDate } from '@/lib/dateUtils'
import * as d3 from 'd3'
import { HousePlug, Sun, Zap, ArrowRight, ArrowLeft } from 'lucide-react'
import * as ReactDOM from 'react-dom'

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
    const nodeRadius = 50 // Keeping the circle size at 50 pixels
    
    // Add filter definition for glow effect
    const defs = svg.append("defs")
    defs.append("filter")
      .attr("id", "glow")
      .html(`
        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      `)
    
    // Define node positions with more spacing between them
    const nodes = {
      solar: {
        x: width * 0.5,
        y: height * 0.2,
        label: 'PV',
        value: `${data.production_power.toFixed(1)} W`,
        color: '#66BB6A'
      },
      grid: {
        x: width * 0.15, // Moved further left (was 0.2)
        y: height * 0.7,  // Moved slightly lower (was 0.65)
        label: 'Réseau',
        value: `${Math.abs(data.power).toFixed(1)} W`,
        color: '#42A5F5'
      },
      home: {
        x: width * 0.85, // Moved further right (was 0.8)
        y: height * 0.7,  // Moved slightly lower (was 0.65)
        label: 'Maison',
        value: `${(data.power + data.production_power).toFixed(1)} W`,
        color: '#F97316'
      }
    }
    
    // Create node circles with icon on top
    Object.entries(nodes).forEach(([key, node]) => {
      const nodeGroup = svg.append('g')
        .attr('transform', `translate(${node.x}, ${node.y})`)
        .attr('class', `node-${key}`)
      
      // Background circle
      nodeGroup.append('circle')
        .attr('r', nodeRadius)
        .attr('fill', 'white')
        .attr('stroke', node.color)
        .attr('stroke-width', 3)
        .style('filter', 'drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.1))')
      
      // Create icon container at the top of circle - moved 5px higher
      const iconY = -35; // Changed from -30 to -35 to move up by 5px
      
      const foreignObject = nodeGroup.append("foreignObject")
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
      
      let iconColor = node.color;
      
      if (key === "solar") {
        ReactDOM.render(
          <Sun size={24} color={iconColor} strokeWidth={2} />,
          container
        );
      } else if (key === "home") {
        ReactDOM.render(
          <HousePlug size={24} color={iconColor} strokeWidth={2} />,
          container
        );
      } else if (key === "grid") {
        ReactDOM.render(
          <Zap size={24} color={iconColor} strokeWidth={2} />,
          container
        );
      }
      
      // Power value text
      nodeGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '5px')
        .attr('fill', node.color)
        .attr('font-weight', 'bold')
        .attr('font-size', '16px')
        .text(node.label)
      
      nodeGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '30px')
        .attr('fill', node.color)
        .attr('font-size', '14px')
        .text(node.value)
    })
    
    // Helper function to normalize power values to stroke widths
    const getStrokeWidth = (power: number) => {
      const absValue = Math.abs(power);
      // Min 2, max 10, with a logarithmic scale to better visualize different power levels
      return Math.max(2, Math.min(10, 2 + 8 * Math.log10(1 + absValue / 100)));
    };
    
    // Create flow paths between nodes with animations
    const arrowPaths = [
      {
        id: "gridToHome",
        source: "grid",
        target: "home",
        active: flowAnimations.gridToHome,
        color: "#ef4444",
        curveOffset: -80, // Increased offset for wider spacing
        power: data.power
      },
      {
        id: "gridFromHome",
        source: "home", 
        target: "grid",
        active: flowAnimations.gridFromHome,
        color: "#388E3C",
        curveOffset: 80, // Increased offset for wider spacing
        power: -data.power
      },
      {
        id: "solarToHome",
        source: "solar",
        target: "home",
        active: flowAnimations.solarToHome,
        color: "#66BB6A",
        curveOffset: 0,
        power: Math.min(data.production_power, data.production_power + data.power)
      },
      {
        id: "solarToGrid",
        source: "solar",
        target: "grid",
        active: flowAnimations.solarToGrid,
        color: "#388E3C",
        curveOffset: 0,
        power: Math.max(0, -data.power)
      }
    ]
    
    // Create paths with curved lines like in D3EnergyFlow
    arrowPaths.forEach(path => {
      if (path.active) {
        const sourceNode = nodes[path.source as keyof typeof nodes]
        const targetNode = nodes[path.target as keyof typeof nodes]
        
        // Calculate path points
        const dx = targetNode.x - sourceNode.x
        const dy = targetNode.y - sourceNode.y
        const dist = Math.sqrt(dx*dx + dy*dy)
        
        // Start and end points with offset from circle edge
        const offset = nodeRadius + 5
        const ratioStart = offset / dist
        const ratioEnd = (dist - offset) / dist
        
        const x1 = sourceNode.x + dx * ratioStart
        const y1 = sourceNode.y + dy * ratioStart
        const x2 = sourceNode.x + dx * ratioEnd
        const y2 = sourceNode.y + dy * ratioEnd
        
        // Control point for curve
        const mx = (x1 + x2) / 2
        const my = (y1 + y2) / 2 + path.curveOffset
        
        // Get appropriate stroke width based on power
        const strokeWidth = getStrokeWidth(path.power);
        
        // Create the path
        const flowPath = svg.append('path')
          .attr('d', `M ${x1},${y1} Q ${mx},${my} ${x2},${y2}`)
          .attr('fill', 'none')
          .attr('stroke', path.color)
          .attr('stroke-width', strokeWidth)
          .attr('stroke-dasharray', '8 8')
          .attr('filter', 'url(#glow)')
        
        // Animate the dash offset for flowing effect
        function animateDash() {
          flowPath.transition()
            .duration(1500)
            .ease(d3.easeLinear)
            .attrTween('stroke-dashoffset', () => d3.interpolate(0, -16) as any)
            .on('end', animateDash)
        }
        
        animateDash()
        
        // Calculate position exactly on the flow path for the label
        // First, find a point on the quadratic Bezier curve
        // We want the label to be centered on the path
        const t = 0.5; // Parameter t for the Bezier curve (0.5 = middle)
        const bezierX = (1-t)*(1-t)*x1 + 2*(1-t)*t*mx + t*t*x2;
        const bezierY = (1-t)*(1-t)*y1 + 2*(1-t)*t*my + t*t*y2;
        
        const labelGroup = svg.append('g')
          .attr('class', `path-label-${path.id}`)
        
        labelGroup.append('rect')
          .attr('x', bezierX - 40)
          .attr('y', bezierY - 15)
          .attr('width', 80)
          .attr('height', 24)
          .attr('rx', 12)
          .attr('ry', 12)
          .attr('fill', 'white')
          .attr('stroke', path.color)
          .attr('stroke-width', 1)
          .attr('fill-opacity', 0.9)
        
        labelGroup.append('text')
          .attr('x', bezierX)
          .attr('y', bezierY)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', 12)
          .attr('fill', path.color)
          .text(() => {
            let power = 0
            if (path.id === 'gridToHome') power = data.power
            else if (path.id === 'gridFromHome') power = -data.power
            else if (path.id === 'solarToHome') {
              const toGrid = data.power < 0 ? -data.power : 0
              power = data.production_power - toGrid
            }
            else if (path.id === 'solarToGrid') power = -data.power
            
            return `${Math.abs(power).toFixed(1)} W`
          })
      }
    })
    
  }, [data, flowAnimations, size])
  
  if (!data) {
    return (
      <Card className={cn("overflow-hidden backdrop-blur-sm bg-white/90 border-0 shadow-md h-full", className)}>
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
    <Card className={cn("overflow-hidden backdrop-blur-sm bg-white/90 border-0 shadow-md h-full", className)}>
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
