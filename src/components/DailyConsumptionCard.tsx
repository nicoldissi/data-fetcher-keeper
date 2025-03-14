
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useDailyEnergyTotals } from '@/hooks/useDailyEnergyTotals';

interface DailyConsumptionCardProps {
  className?: string;
  configId?: string;
}

export function DailyConsumptionCard({ className, configId }: DailyConsumptionCardProps) {
  const { dailyTotals, loading, error } = useDailyEnergyTotals(configId);

  // Calculate total consumption in kWh
  const totalConsumption = ((dailyTotals?.consumption || 0) / 1000).toFixed(2);
  
  return (
    <Card className={cn("overflow-hidden backdrop-blur-sm bg-white/90 border-0 shadow-md", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center">
          <span className="bg-orange-50 text-orange-700 text-xs px-2 py-0.5 rounded mr-2">DAILY</span>
          Consommation Totale
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : error ? (
          <p className="text-red-500">{error.message || "Une erreur s'est produite"}</p>
        ) : (
          <div className="text-center py-4">
            <p className="text-4xl font-bold">{totalConsumption} kWh</p>
            <p className="text-sm text-muted-foreground mt-2">Aujourd'hui</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
