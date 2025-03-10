import { useEffect, useRef, useState } from 'react'
import { ShellyEMData } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatLocalDate, parseToLocalDate } from '@/lib/dateUtils'
import * as d3 from 'd3'
import { HousePlug, Sun, Zap, ArrowRight, ArrowLeft, Clock, Calendar } from 'lucide-react'
import * as ReactDOM from 'react-dom'
import { Toggle } from '@/components/ui/toggle'
import { D3EnergyFlow } from './energy-flow/D3EnergyFlow'

interface EnergyFlowChartDarkProps {
  data: ShellyEMData | null
  className?: string
  configId?: string
}

interface FlowAnimationState {
  gridToHome: boolean
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

export function EnergyFlowChartDark({ data, className, configId }: EnergyFlowChartDarkProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 400, height: 400 })
  const [flowAnimations, setFlowAnimations] = useState<FlowAnimationState>({
    gridToHome: false,
    solarToHome: false,
    solarToGrid: false
  })
  const [viewMode, setViewMode] = useState<'realtime' | 'daily'>('realtime')
  const [hasData, setHasData] = useState(false)
  
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
    
    if (!hasData) {
      setHasData(true)
    }
    
    console.log('EnergyFlowChartDark received new data:', data)
    
    const localDate = parseToLocalDate(data.timestamp)
    const formattedTime = formatLocalDate(data.timestamp)
    
    console.log('Converted timestamp:', formattedTime)
    
    const isPVProducing = data.pv_power > 6
    const homeConsumption = data.pv_power + data.power
    
    const isGridImporting = data.power > 0
    const isGridExporting = data.power < 0
    const isPVExceedingHomeNeeds = isPVProducing && data.pv_power > homeConsumption
    
    setFlowAnimations({
      gridToHome: isGridImporting && !isPVExceedingHomeNeeds,
      solarToHome: isPVProducing,
      solarToGrid: isPVProducing && isGridExporting
    })
  }, [data])
  
  useEffect(() => {
    if (!svgRef.current || !data) return
    
    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()
    
    const { width, height } = size
    const nodeRadius = 60
    
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
    
    const centers = {
      solar: {
        x: width * 0.5,
        y: height * 0.2,
        label: 'PV',
        value: `${data.pv_power.toFixed(1)} W`,
        color: '#66BB6A'
      },
      grid: {
        x: width * 0.15,
        y: height * 0.7,
        label: 'Réseau',
        value: `${Math.abs(data.power).toFixed(1)} W`,
        color: '#42A5F5'
      },
      home: {
        x: width * 0.85,
        y: height * 0.7,
        label: 'Maison',
        value: `${(data.power + data.pv_power).toFixed(1)} W`,
        color: '#F97316'
      }
    }
    
    Object.entries(centers).forEach(([key, node]) => {
      const nodeGroup = svg.append('g')
        .attr('transform', `translate(${node.x}, ${node.y})`)
        .attr('class', `node-${key}`)
      
      nodeGroup.append('circle')
        .attr('r', nodeRadius)
        .attr('fill', 'white')
        .attr('stroke', node.color)
        .attr('stroke-width', 3)
        .style('filter', 'drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.1))')
      
      const iconY = -40
      
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
    
    const getStrokeWidth = (power: number) => {
      const absValue = Math.abs(power);
      return Math.max(2, Math.min(10, 2 + 8 * Math.log10(1 + absValue / 100)));
    };
    
    const arrowPaths = [
      {
        id: "gridToHome",
        source: "grid",
        target: "home",
        active: flowAnimations.gridToHome,
        color: "#42A5F5",
        curveOffset: -100,
        power: data.power,
        title: "Réseau"
      },
      {
        id: "solarToHome",
        source: "solar",
        target: "home",
        active: flowAnimations.solarToHome,
        color: "#66BB6A",
        curveOffset: 0,
        power: Math.min(data.pv_power, data.pv_power + data.power),
        title: "Autoconsommation"
      },
      {
        id: "solarToGrid",
        source: "solar",
        target: "grid",
        active: flowAnimations.solarToGrid,
        color: "#388E3C",
        curveOffset: 0,
        power: Math.max(0, -data.power),
        title: "Injection"
      }
    ]
    
    arrowPaths.forEach(path => {
      if (path.active) {
        const sourceNode = centers[path.source as keyof typeof centers]
        const targetNode = centers[path.target as keyof typeof centers]
        
        const dx = targetNode.x - sourceNode.x
        const dy = targetNode.y - sourceNode.y
        const dist = Math.sqrt(dx*dx + dy*dy)
        
        const offset = nodeRadius + 5
        const ratioStart = offset / dist
        const ratioEnd = (dist - offset) / dist
        
        const x1 = sourceNode.x + dx * ratioStart
        const y1 = sourceNode.y + dy * ratioStart
        const x2 = sourceNode.x + dx * ratioEnd
        const y2 = sourceNode.y + dy * ratioEnd
        
        const mx = (x1 + x2) / 2
        const my = (y1 + y2) / 2 + path.curveOffset
        
        const strokeWidth = getStrokeWidth(path.power);
        
        const flowPath = svg.append('path')
          .attr('d', `M ${x1},${y1} Q ${mx},${my} ${x2},${y2}`)
          .attr('fill', 'none')
          .attr('stroke', path.color)
          .attr('stroke-width', strokeWidth)
          .attr('stroke-dasharray', '8 8')
          .attr('filter', 'url(#glow)')
        
        function animateDash() {
          flowPath.transition()
            .duration(1500)
            .ease(d3.easeLinear)
            .attrTween('stroke-dashoffset', () => d3.interpolate(0, -16) as any)
            .on('end', animateDash)
        }
        
        animateDash()
        
        const t = 0.5
        const bezierX = (1-t)*(1-t)*x1 + 2*(1-t)*t*mx + t*t*x2;
        const bezierY = (1-t)*(1-t)*y1 + 2*(1-t)*t*my + t*t*y2;
        
        let labelTitle = path.title;
        let labelValue = "";
        
        if (path.id === 'gridToHome') {
          labelValue = `${Math.abs(data.power).toFixed(1)} W`;
        } else if (path.id === 'solarToHome') {
          const toGrid = data.power < 0 ? -data.power : 0;
          const powerValue = data.pv_power - toGrid;
          labelValue = `${Math.abs(powerValue).toFixed(1)} W`;
        } else if (path.id === 'solarToGrid') {
          labelValue = `${Math.abs(data.power).toFixed(1)} W`;
        }
        
        const titleLength = labelTitle.length;
        const valueLength = labelValue.length;
        const maxLength = Math.max(titleLength, valueLength);
        const labelWidth = Math.max(80, maxLength * 8);
        
        const labelGroup = svg.append('g')
          .attr('class', `path-label-${path.id}`)
        
        labelGroup.append('rect')
          .attr('x', bezierX - labelWidth/2)
          .attr('y', bezierY - 25)
          .attr('width', labelWidth)
          .attr('height', 40)
          .attr('rx', 12)
          .attr('ry', 12)
          .attr('fill', 'white')
          .attr('stroke', path.color)
          .attr('stroke-width', 1)
          .attr('fill-opacity', 0.9)
        
        labelGroup.append('text')
          .attr('x', bezierX)
          .attr('y', bezierY - 8)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', 12)
          .attr('font-weight', 'medium')
          .attr('fill', path.color)
          .text(labelTitle);
        
        labelGroup.append('text')
          .attr('x', bezierX)
          .attr('y', bezierY + 10)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', 13)
          .attr('font-weight', 'bold')
          .attr('fill', path.color)
          .text(labelValue);
      }
    })
  }, [data, flowAnimations, size])
  
  return (
    <Card className={cn("overflow-hidden backdrop-blur-sm bg-white/90 border-0 shadow-md h-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center justify-between">
          <div className="flex items-center">
            <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded mr-2">FLUX D'ÉNERGIE</span>
          </div>
          <div className="bg-muted inline-flex items-center rounded-md p-1">
            <Toggle
              pressed={viewMode === 'realtime'}
              onPressedChange={() => setViewMode('realtime')}
              variant="outline"
              size="sm"
              className="px-3 data-[state=on]:bg-background"
            >
              <Clock className="h-4 w-4 mr-2" />
              <span>Temps réel</span>
            </Toggle>
            <Toggle
              pressed={viewMode === 'daily'}
              onPressedChange={() => setViewMode('daily')}
              variant="outline"
              size="sm"
              className="px-3 data-[state=on]:bg-background"
            >
              <Calendar className="h-4 w-4 mr-2" />
              <span>Journalier</span>
            </Toggle>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center p-6 min-h-[300px]">
        {viewMode === 'realtime' ? (
          data ? (
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
          ) : (
            <div className="text-center text-muted-foreground">
              <p>En attente de données...</p>
              <p className="text-sm">Les données seront affichées dès qu'elles seront disponibles.</p>
            </div>
          )
        ) : (
          <D3EnergyFlow configId={configId} />
        )}
      </CardContent>
    </Card>
  )
}
