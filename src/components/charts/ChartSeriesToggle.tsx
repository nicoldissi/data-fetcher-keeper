
import { Toggle } from '@/components/ui/toggle';
import { ReactNode } from 'react';
import { Zap } from 'lucide-react';

interface ChartSeriesToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  color: string;
  icon?: ReactNode;
}

export function ChartSeriesToggle({
  label,
  value,
  onChange,
  color,
  icon
}: ChartSeriesToggleProps) {
  // Determine background color class based on state and color theme
  const getBgClass = (baseColor: string) => {
    if (!value) return '';
    
    const colorMap: Record<string, string> = {
      '#F97415': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
      '#00FF59': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
      'blue-500': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
      '#9b87f5': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
    };
    
    return colorMap[baseColor] || '';
  };

  return (
    <Toggle 
      pressed={value} 
      onPressedChange={onChange}
      className={getBgClass(color)}
    >
      {icon ? (
        icon
      ) : (
        <div 
          className="w-3 h-3 rounded-full mr-2" 
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </Toggle>
  );
}
