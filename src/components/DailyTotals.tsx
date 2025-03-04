import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDailyEnergyTotals } from '@/hooks/useDailyEnergyTotals';

export function DailyTotals() {
  const { dailyTotals, loading, error } = useDailyEnergyTotals();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <Card className="overflow-hidden backdrop-blur-sm bg-white/90 border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center">
            <span className="bg-orange-50 text-orange-700 text-xs px-2 py-0.5 rounded mr-2">DAILY</span>
            Réseau
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            <p className="text-3xl font-bold">
              {(dailyTotals.consumption / 1000).toFixed(2)} kWh
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden backdrop-blur-sm bg-white/90 border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center">
            <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded mr-2">DAILY</span>
            Grid Injection
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            <p className="text-3xl font-bold">
              {(dailyTotals.injection / 1000).toFixed(2)} kWh
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden backdrop-blur-sm bg-white/90 border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center">
            <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded mr-2">DAILY</span>
            Total Production
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            <p className="text-3xl font-bold">
              {(dailyTotals.production / 1000).toFixed(2)} kWh
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}