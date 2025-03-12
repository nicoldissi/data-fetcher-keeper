
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, fromUnixTime } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ShellyEMData } from '@/lib/types';

interface HistoricalEnergyChartProps {
  history: ShellyEMData[];
}

export default function HistoricalEnergyChart({ history }: HistoricalEnergyChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    // Transform history data for the chart
    const transformedData = history.map((item) => {
      const date = new Date(item.timestamp);
      return {
        time: format(date, 'HH:mm:ss', { locale: fr }),
        consumption: Math.round(item.power),
        production: Math.round(item.pv_power || 0),
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
                  dataKey="consumption"
                  name="Consommation (W)"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="production"
                  name="Production (W)"
                  stroke="#82ca9d"
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
