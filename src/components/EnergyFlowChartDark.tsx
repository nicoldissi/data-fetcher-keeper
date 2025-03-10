
import { useEffect, useRef, useState } from 'react'
import { ShellyEMData } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatLocalDate, parseToLocalDate } from '@/lib/dateUtils'
import * as d3 from 'd3'
import { HousePlug, Sun, Zap, ArrowRight, ArrowLeft, Clock, Calendar, Gauge } from 'lucide-react'
import * as ReactDOM from 'react-dom'
import { Toggle } from '@/components/ui/toggle'
import { D3EnergyFlow } from './energy-flow/D3EnergyFlow'
import { getShellyConfig } from '@/lib/api'

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
  const [lastData, setLastData] = useState<ShellyEMData | null>(null)
  const [maxInverterPower, setMaxInverterPower] = useState<number>(3.0)
  const [maxGridPower, setMaxGridPower] = useState<number>(6.0)
  
  // Load Shelly config to get max power values
  useEffect(() => {
    const loadConfig = async () => {
      const config = await getShellyConfig(configId);
      setMaxInverterPower(config.inverterPowerKva || 3.0);
      setMaxGridPower(config.gridSubscriptionKva || 6.0);
    };
    
    loadConfig();
  }, [configId]);
  
  // Store the last valid data
  useEffect(() => {
    if (data) {
      setLastData(data);
    }
  }, [data]);
  
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
  
  // Update flow animations when data changes
  useEffect(() => {
    if (!data) return
    
    console.log('EnergyFlowChartDark received new data:', data)
    
    const localDate = parseToLocalDate(data.timestamp)
    const formattedTime = formatLocalDate(data.timestamp)
    
    console.log('Converted timestamp:', formattedTime)
    
    const isPVProducing = data.pv_power > 6
    const homeConsumption = data.pv_power + data.power
    
    // Determine flow directions based on power values
    const isGridImporting = data.power > 0  // Positive means importing FROM grid
    const isGridExporting = data.power < 0  // Negative means exporting TO grid
    const isPVExceedingHomeNeeds = isPVProducing && data.pv_power > homeConsumption
    
    // Fix: Use correct logic for determining flow animations
    setFlowAnimations({
      // Only show grid to home flow when grid is supplying power AND PV isn't meeting all needs
      gridToHome: isGridImporting && !isPVExceedingHomeNeeds,
      
      // Show solar to home when PV is producing
      solarToHome: isPVProducing,
      
      // Only show solar to grid when PV is producing AND we're exporting to grid
      solarToGrid: isPVProducing && isGridExporting
    })
    
  }, [data])
  
  // D3 visualization effect
  useEffect(() => {
    // Use lastData when available, otherwise fallback to data
    const currentData = viewMode === 'realtime' ? (data || lastData) : null;
    if (!svgRef.current || !currentData) return
    
    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()
    
    const { width, height } = size
    const nodeRadius = 60
    
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
    
    // Define node positions with same spacing as daily view
    const centers = {
      solar: {
        x: width * 0.5,
        y: height * 0.2,
        label: 'PV',
        value: `${currentData.pv_power.toFixed(1)} W`,
        color: '#66BB6A'
      },
      grid: {
        x: width * 0.15,
        y: height * 0.7,
        label: 'Réseau',
        value: `${Math.abs(currentData.power).toFixed(1)} W`,
        color: '#42A5F5'
      },
      home: {
        x: width * 0.85,
        y: height * 0.7,
        label: 'Maison',
        value: `${(currentData.power + currentData.pv_power).toFixed(1)} W`,
        color: '#F97316'
      }
    }
    
    // Create node circles with icon on top
    Object.entries(centers).forEach(([key, node]) => {
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
      
      // Create gauge arcs for solar and grid
      if (key === 'solar') {
        // Convert Watts to kW for comparison with inverter kVA
        const pvPowerKw = currentData.pv_power / 1000;
        const percentOfMax = Math.min(1, pvPowerKw / maxInverterPower);
        
        // Draw gauge background
        const arcBg = d3.arc()
          .innerRadius(nodeRadius - 8)
          .outerRadius(nodeRadius)
          .startAngle(-Math.PI / 2)
          .endAngle(Math.PI / 2);
          
        nodeGroup.append('path')
          .attr('d', arcBg() as string)
          .attr('fill', '#f0f0f0');
          
        // Draw gauge value
        const arcValue = d3.arc()
          .innerRadius(nodeRadius - 8)
          .outerRadius(nodeRadius)
          .startAngle(-Math.PI / 2)
          .endAngle(-Math.PI / 2 + percentOfMax * Math.PI);
          
        nodeGroup.append('path')
          .attr('d', arcValue() as string)
          .attr('fill', '#66BB6A');
          
        // Add min/max labels
        nodeGroup.append('text')
          .attr('x', -nodeRadius + 5)
          .attr('y', 5)
          .attr('text-anchor', 'start')
          .attr('font-size', '9px')
          .attr('fill', '#666')
          .text('0');
          
        nodeGroup.append('text')
          .attr('x', nodeRadius - 5)
          .attr('y', 5)
          .attr('text-anchor', 'end')
          .attr('font-size', '9px')
          .attr('fill', '#666')
          .text(`${maxInverterPower}kVA`);
          
      } else if (key === 'grid') {
        // For grid, create a bidirectional gauge from -max to +max
        // Convert Watts to kW
        const gridPowerKw = currentData.power / 1000;
        // Power is positive when importing, negative when exporting
        const percentOfMax = gridPowerKw / maxGridPower; // Will be negative for export
        
        // Draw gauge background
        const arcBg = d3.arc()
          .innerRadius(nodeRadius - 8)
          .outerRadius(nodeRadius)
          .startAngle(-Math.PI)
          .endAngle(0);
          
        nodeGroup.append('path')
          .attr('d', arcBg() as string)
          .attr('fill', '#f0f0f0');
          
        // Draw gauge value - different logic for import vs export
        if (gridPowerKw >= 0) { // Importing
          const arcValue = d3.arc()
            .innerRadius(nodeRadius - 8)
            .outerRadius(nodeRadius)
            .startAngle(-Math.PI / 2)
            .endAngle(-Math.PI / 2 + Math.min(1, percentOfMax) * (Math.PI / 2));
            
          nodeGroup.append('path')
            .attr('d', arcValue() as string)
            .attr('fill', '#42A5F5');
        } else { // Exporting
          const arcValue = d3.arc()
            .innerRadius(nodeRadius - 8)
            .outerRadius(nodeRadius)
            .startAngle(-Math.PI / 2 + Math.max(-1, percentOfMax) * (Math.PI / 2))
            .endAngle(-Math.PI / 2);
            
          nodeGroup.append('path')
            .attr('d', arcValue() as string)
            .attr('fill', '#388E3C'); // Green for export
        }
          
        // Add min/max/export labels
        nodeGroup.append('text')
          .attr('x', -nodeRadius + 2)
          .attr('y', 5)
          .attr('text-anchor', 'start')
          .attr('font-size', '9px')
          .attr('fill', '#388E3C') // Green for export
          .text(`-${maxGridPower}kVA`);
          
        nodeGroup.append('text')
          .attr('x', nodeRadius - 2)
          .attr('y', 5)
          .attr('text-anchor', 'end')
          .attr('font-size', '9px')
          .attr('fill', '#42A5F5') // Blue for import
          .text(`+${maxGridPower}kVA`);
      }
      
      // Create icon container at the top of circle
      const iconY = -40;
      
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
    
    // Create flow paths between nodes with animations - increased curve offset for wider spacing
    const arrowPaths = [
      {
        id: "gridToHome",
        source: "grid",
        target: "home",
        active: flowAnimations.gridToHome,
        color: "#42A5F5", // Blue color consistent with daily view
        curveOffset: -100, // Same curve offset as daily view
        power: currentData.power
      },
      {
        id: "solarToHome",
        source: "solar",
        target: "home",
        active: flowAnimations.solarToHome,
        color: "#66BB6A",
        curveOffset: 0,
        power: Math.min(currentData.pv_power, currentData.pv_power + currentData.power)
      },
      {
        id: "solarToGrid",
        source: "solar",
        target: "grid",
        active: flowAnimations.solarToGrid,
        color: "#388E3C",
        curveOffset: 0,
        power: Math.max(0, -currentData.power)
      }
    ]
    
    // Create paths with curved lines
    arrowPaths.forEach(path => {
      if (path.active) {
        const sourceNode = centers[path.source as keyof typeof centers]
        const targetNode = centers[path.target as keyof typeof centers]
        
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
            if (path.id === 'gridToHome') power = currentData.power
            else if (path.id === 'solarToHome') {
              const toGrid = currentData.power < 0 ? -currentData.power : 0
              power = currentData.pv_power - toGrid
            }
            else if (path.id === 'solarToGrid') power = -currentData.power
            
            return `${Math.abs(power).toFixed(1)} W`
          })
      }
    })
    
  }, [data, lastData, flowAnimations, size, viewMode, maxInverterPower, maxGridPower])

  // Handle view mode toggle
  const handleViewModeChange = (mode: 'realtime' | 'daily') => {
    setViewMode(mode);
  };

  if (!data && !lastData) {
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
                onPressedChange={() => handleViewModeChange('realtime')}
                variant="outline"
                size="sm"
                className="px-3 data-[state=on]:bg-background"
              >
                <Clock className="h-4 w-4 mr-2" />
                <span>Temps réel</span>
              </Toggle>
              <Toggle
                pressed={viewMode === 'daily'}
                onPressedChange={() => handleViewModeChange('daily')}
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
            <div className="text-center text-muted-foreground">
              <p>En attente de données...</p>
              <p className="text-sm">Les données seront affichées dès qu'elles seront disponibles.</p>
            </div>
          ) : (
            <D3EnergyFlow configId={configId} />
          )}
        </CardContent>
      </Card>
    );
  }

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
              onPressedChange={() => handleViewModeChange('realtime')}
              variant="outline"
              size="sm"
              className="px-3 data-[state=on]:bg-background"
            >
              <Clock className="h-4 w-4 mr-2" />
              <span>Temps réel</span>
            </Toggle>
            <Toggle
              pressed={viewMode === 'daily'}
              onPressedChange={() => handleViewModeChange('daily')}
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
      <CardContent className="flex items-center justify-center p-6">
        {viewMode === 'realtime' ? (
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
          <D3EnergyFlow configId={configId} className="w-full h-full" />
        )}
      </CardContent>
    </Card>
  );
}
