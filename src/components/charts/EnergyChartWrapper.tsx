
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import React from 'react';

interface EnergyChartWrapperProps {
  title: string;
  description?: string;
  controls?: React.ReactNode;
  children: React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function EnergyChartWrapper({
  title,
  description,
  controls,
  children,
  isLoading = false,
  className,
}: EnergyChartWrapperProps) {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {controls && (
            <div className="flex flex-wrap gap-2">
              {controls}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="h-[500px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Chargement des données...</p>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
