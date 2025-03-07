import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, fromUnixTime } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ShellyEMData } from '@/lib/types';

interface HistoricalEnergyChartProps {
  history: ShellyEMData[];
}

// Define the type for the chart data points
interface ChartDataPoint {
  time: string;
  consumption: number;
  production: number;
  grid: number; // Added grid property
}

export default function HistoricalEnergyChart({ history }: HistoricalEnergyChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    // Transform all history data for the chart without limiting data points
    const transformedData: ChartDataPoint[] = history.map((item: ShellyEMData) => {
      const date = new Date(item.timestamp);
      const consumption = Math.round(item.power + (item.production_power || 0));
      const production = Math.round(item.production_power || 0);
      const grid = Math.round(item.power);
      
      return {
        time: format(date, 'HH:mm', { locale: fr }),
        consumption,
        production,
        grid
      };
    });

    setChartData(transformedData);
  }, [history]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Historique de Consommation et Production</CardTitle>
        <CardDescription>
          Évolution de la consommation et production d'énergie
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 20,
                  left: 0,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis label={{ value: 'Watts', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="grid"
                  name="Réseau"
                  stroke="#007bff" // Blue color for grid
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="production"
                  name="Production"
                  stroke="#10b981" // Green color for production
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="consumption"
                  name="Consommation"
                  stroke="#f97316" // Orange color for consumption
                  dot={false}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Pas de données disponibles</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}