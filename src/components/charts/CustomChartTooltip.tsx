
import { TooltipProps } from 'recharts';
import { formatLocalDate } from '@/lib/dateUtils';

interface ChartDataPoint {
  name: string;
  value: number;
  color: string;
  unit?: string;
}

export function CustomChartTooltip({ 
  active, 
  payload, 
  label 
}: TooltipProps<number, string>) {
  if (active && payload && payload.length) {
    // Format le label (qui est la date/heure) en utilisant notre fonction d'utilitaire
    const formattedLabel = label ? label : '';
    
    return (
      <div className="bg-background border rounded-md shadow-md p-3 font-sans">
        <p className="font-semibold">{formattedLabel}</p>
        {payload.map((entry: any, index: number) => {
          const isVoltage = entry.name === 'Tension';
          const unit = isVoltage ? 'V' : 'W';
          
          return (
            <div key={`tooltip-${index}`} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-muted-foreground">{entry.name}:</span>
              <span className="font-medium">
                {`${Math.abs(Math.round(entry.value))} ${unit}`}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
}
