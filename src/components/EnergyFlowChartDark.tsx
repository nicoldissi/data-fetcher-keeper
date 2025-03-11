
import { useRef, useState, useEffect } from 'react'
import { ShellyEMData } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatLocalDate, parseToLocalDate } from '@/lib/dateUtils'
import { Clock, Calendar } from 'lucide-react'
import { Toggle } from '@/components/ui/toggle'
import { D3EnergyFlow } from './energy-flow/D3EnergyFlow'
import { D3RealtimeEnergyFlow } from './energy-flow/D3RealtimeEnergyFlow'
import { D3RealtimeEnergyFlowComponent } from './energy-flow/D3RealtimeEnergyFlowComponent'

interface EnergyFlowChartDarkProps {
  data: ShellyEMData | null
  className?: string
  configId?: string
}

export function EnergyFlowChartDark({ data, className, configId }: EnergyFlowChartDarkProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useState<'realtime' | 'daily'>('realtime')
  const [hasData, setHasData] = useState(false)
  
  useEffect(() => {
    if (!data) return
    
    if (!hasData) {
      setHasData(true)
    }
    
    console.log('EnergyFlowChartDark received new data:', data)
    
    const localDate = parseToLocalDate(data.timestamp)
    const formattedTime = formatLocalDate(data.timestamp)
    
    console.log('Converted timestamp:', formattedTime)
  }, [data])
  
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
      <CardContent className="flex items-center justify-center p-4">
        {viewMode === 'realtime' ? (
          data ? (
            <div className="w-full h-[500px]">
              <D3RealtimeEnergyFlowComponent data={data} className="w-full h-full" />
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <p>En attente de données...</p>
              <p className="text-sm">Les données seront affichées dès qu'elles seront disponibles.</p>
            </div>
          )
        ) : (
          <div className="w-full h-[500px]">
            <D3EnergyFlow configId={configId} className="w-full h-full" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
