
import { useEffect, useRef, useState } from 'react'
import { ShellyEMData } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Stage, Layer, Circle, Text, Arrow, Group } from 'react-konva'
import Konva from 'konva'

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
  const containerRef = useRef<HTMLDivElement>(null)
  const [stageSize, setStageSize] = useState({ width: 400, height: 400 })
  const [flowAnimations, setFlowAnimations] = useState<FlowAnimationState>({
    gridToHome: false,
    gridFromHome: false,
    solarToHome: false,
    solarToGrid: false
  })
  
  // Arrows references for animation
  const gridToHomeArrowRef = useRef<Konva.Arrow>(null)
  const gridFromHomeArrowRef = useRef<Konva.Arrow>(null)
  const solarToHomeArrowRef = useRef<Konva.Arrow>(null)
  const solarToGridArrowRef = useRef<Konva.Arrow>(null)
  
  // Update stage size on window resize
  useEffect(() => {
    const updateStageSize = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        setStageSize({
          width: offsetWidth, 
          height: Math.min(400, offsetWidth) // Keeping aspect ratio
        })
      }
    }
    
    updateStageSize()
    window.addEventListener('resize', updateStageSize)
    
    return () => {
      window.removeEventListener('resize', updateStageSize)
    }
  }, [])
  
  // Update flow animations based on new data
  useEffect(() => {
    if (!data) return
    
    console.log('EnergyFlowChartDark received new data:', data)
    
    // Determine flow scenarios
    const isPVProducing = data.production_power > 6 // Minimum threshold for production
    const isGridSupplyingHome = data.power > 0
    const isGridReceivingExcess = data.power < 0
    
    // Update animation states
    setFlowAnimations({
      gridToHome: isGridSupplyingHome,
      gridFromHome: isGridReceivingExcess,
      solarToHome: isPVProducing,
      solarToGrid: isPVProducing && isGridReceivingExcess
    })
    
  }, [data])
  
  // Run arrow animations
  useEffect(() => {
    const animateArrow = (
      arrowRef: React.RefObject<Konva.Arrow>,
      isActive: boolean,
      duration: number
    ) => {
      if (arrowRef.current && isActive) {
        // Clear any existing animations
        arrowRef.current.stopAnimation();
        
        // Create the dash animation
        const amplitude = 10;
        arrowRef.current.dashOffset(0);
        
        const anim = new Konva.Animation((frame) => {
          if (!frame || !arrowRef.current) return;
          const dashOffset = -((frame.time / duration) * amplitude) % 20;
          arrowRef.current.dashOffset(dashOffset);
          arrowRef.current.opacity(1); // Ensure visible
        }, arrowRef.current.getLayer());
        
        anim.start();
        
        return anim;
      } else if (arrowRef.current) {
        arrowRef.current.opacity(0); // Hide when inactive
      }
    };
    
    // Start animations for active flows
    const animations = [
      animateArrow(gridToHomeArrowRef, flowAnimations.gridToHome, 500),
      animateArrow(gridFromHomeArrowRef, flowAnimations.gridFromHome, 500),
      animateArrow(solarToHomeArrowRef, flowAnimations.solarToHome, 300),
      animateArrow(solarToGridArrowRef, flowAnimations.solarToGrid, 300)
    ];
    
    // Cleanup function to stop all animations
    return () => {
      animations.forEach(anim => anim?.stop());
    };
  }, [flowAnimations]);
  
  // Node positions based on stage size
  const getNodePositions = (): Record<string, NodePosition> => {
    const { width, height } = stageSize;
    const gridValue = data ? `${data.power.toFixed(1)} W` : '0 W';
    const solarValue = data ? `${data.production_power.toFixed(1)} W` : '0 W';
    const homeValue = data ? `${(data.power + data.production_power).toFixed(1)} W` : '0 W';
    
    return {
      grid: {
        x: width * 0.2,
        y: height * 0.5,
        label: 'Réseau',
        value: gridValue,
        color: '#94a3b8'
      },
      solar: {
        x: width * 0.5,
        y: height * 0.2,
        label: 'PV',
        value: solarValue,
        color: '#f59e0b'
      },
      home: {
        x: width * 0.8,
        y: height * 0.5,
        label: 'Maison',
        value: homeValue,
        color: '#6366f1'
      }
    };
  };
  
  // If no data is available, show a loading state
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
  
  const nodePositions = getNodePositions();

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
          <Stage width={stageSize.width} height={stageSize.height}>
            <Layer>
              {/* Grid to Home Arrow */}
              <Arrow
                ref={gridToHomeArrowRef}
                points={[
                  nodePositions.grid.x + 40, nodePositions.grid.y - 10,
                  (nodePositions.grid.x + nodePositions.home.x) / 2, (nodePositions.grid.y + nodePositions.home.y) / 2 - 20,
                  nodePositions.home.x - 40, nodePositions.home.y - 10
                ]}
                tension={0.4}
                stroke="#ef4444"
                strokeWidth={3}
                dash={[10, 5]}
                dashEnabled={true}
                pointerLength={10}
                pointerWidth={10}
                opacity={flowAnimations.gridToHome ? 1 : 0}
                shadowColor="rgba(239, 68, 68, 0.4)"
                shadowBlur={5}
                shadowOpacity={0.6}
                shadowEnabled={true}
              />
              
              {/* Grid from Home Arrow (Injection) */}
              <Arrow
                ref={gridFromHomeArrowRef}
                points={[
                  nodePositions.home.x - 40, nodePositions.home.y + 10,
                  (nodePositions.grid.x + nodePositions.home.x) / 2, (nodePositions.grid.y + nodePositions.home.y) / 2 + 20,
                  nodePositions.grid.x + 40, nodePositions.grid.y + 10
                ]}
                tension={0.4}
                stroke="#10b981"
                strokeWidth={3}
                dash={[10, 5]}
                dashEnabled={true}
                pointerLength={10}
                pointerWidth={10}
                opacity={flowAnimations.gridFromHome ? 1 : 0}
                shadowColor="rgba(16, 185, 129, 0.4)"
                shadowBlur={5}
                shadowOpacity={0.6}
                shadowEnabled={true}
              />
              
              {/* Solar to Home Arrow */}
              <Arrow
                ref={solarToHomeArrowRef}
                points={[
                  nodePositions.solar.x + 15, nodePositions.solar.y + 30,
                  (nodePositions.solar.x + nodePositions.home.x) / 2, (nodePositions.solar.y + nodePositions.home.y) / 2,
                  nodePositions.home.x - 30, nodePositions.home.y - 20
                ]}
                tension={0.4}
                stroke="#f59e0b"
                strokeWidth={3}
                dash={[10, 5]}
                dashEnabled={true}
                pointerLength={10}
                pointerWidth={10}
                opacity={flowAnimations.solarToHome ? 1 : 0}
                shadowColor="rgba(245, 158, 11, 0.4)"
                shadowBlur={5}
                shadowOpacity={0.6}
                shadowEnabled={true}
              />
              
              {/* Solar to Grid Arrow */}
              <Arrow
                ref={solarToGridArrowRef}
                points={[
                  nodePositions.solar.x - 15, nodePositions.solar.y + 30,
                  (nodePositions.solar.x + nodePositions.grid.x) / 2, (nodePositions.solar.y + nodePositions.grid.y) / 2,
                  nodePositions.grid.x + 30, nodePositions.grid.y - 20
                ]}
                tension={0.4}
                stroke="#10b981"
                strokeWidth={3}
                dash={[10, 5]}
                dashEnabled={true}
                pointerLength={10}
                pointerWidth={10}
                opacity={flowAnimations.solarToGrid ? 1 : 0}
                shadowColor="rgba(16, 185, 129, 0.4)"
                shadowBlur={5}
                shadowOpacity={0.6}
                shadowEnabled={true}
              />
              
              {/* Grid Node */}
              <Group x={nodePositions.grid.x} y={nodePositions.grid.y}>
                <Circle
                  radius={40}
                  fill="white"
                  stroke={nodePositions.grid.color}
                  strokeWidth={2}
                  shadowColor="rgba(148, 163, 184, 0.4)"
                  shadowBlur={10}
                  shadowOpacity={0.6}
                  shadowEnabled={true}
                />
                <Text 
                  text={nodePositions.grid.label}
                  align="center"
                  width={80}
                  offset={{ x: 40, y: 0 }}
                  fill="#64748b"
                  fontStyle="bold"
                />
                <Text 
                  text={nodePositions.grid.value}
                  align="center"
                  width={80}
                  offset={{ x: 40, y: -20 }}
                  y={20}
                  fill="#64748b"
                  fontSize={12}
                />
              </Group>
              
              {/* Solar Node */}
              <Group x={nodePositions.solar.x} y={nodePositions.solar.y}>
                <Circle
                  radius={40}
                  fill="white"
                  stroke={nodePositions.solar.color}
                  strokeWidth={2}
                  shadowColor="rgba(245, 158, 11, 0.4)"
                  shadowBlur={10}
                  shadowOpacity={0.6}
                  shadowEnabled={true}
                />
                <Text 
                  text={nodePositions.solar.label}
                  align="center"
                  width={80}
                  offset={{ x: 40, y: 0 }}
                  fill="#d97706"
                  fontStyle="bold"
                />
                <Text 
                  text={nodePositions.solar.value}
                  align="center"
                  width={80}
                  offset={{ x: 40, y: -20 }}
                  y={20}
                  fill="#d97706"
                  fontSize={12}
                />
              </Group>
              
              {/* Home Node */}
              <Group x={nodePositions.home.x} y={nodePositions.home.y}>
                <Circle
                  radius={40}
                  fill="white"
                  stroke={nodePositions.home.color}
                  strokeWidth={2}
                  shadowColor="rgba(99, 102, 241, 0.4)"
                  shadowBlur={10}
                  shadowOpacity={0.6}
                  shadowEnabled={true}
                />
                <Text 
                  text={nodePositions.home.label}
                  align="center"
                  width={80}
                  offset={{ x: 40, y: 0 }}
                  fill="#4f46e5"
                  fontStyle="bold"
                />
                <Text 
                  text={nodePositions.home.value}
                  align="center"
                  width={80}
                  offset={{ x: 40, y: -20 }}
                  y={20}
                  fill="#4f46e5"
                  fontSize={12}
                />
              </Group>
            </Layer>
          </Stage>
        </div>
      </CardContent>
    </Card>
  )
}
