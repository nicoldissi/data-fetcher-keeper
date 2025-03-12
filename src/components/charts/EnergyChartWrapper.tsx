
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReactNode } from 'react';

interface EnergyChartWrapperProps {
  title: string;
  description: string;
  controls?: ReactNode;
  children: ReactNode;
  isLoading?: boolean;
}

export function EnergyChartWrapper({
  title,
  description,
  controls,
  children,
  isLoading = false
}: EnergyChartWrapperProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {controls && (
            <div className="flex flex-wrap gap-2">
              {controls}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Chargement des données...</p>
            </div>
          ) : children ? (
            children
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
