
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from "lucide-react";
import { cn } from '@/lib/utils';

interface EnergyChartWrapperProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  isLoading?: boolean;
  controls?: React.ReactNode;
  dateSelector?: React.ReactNode;
}

export function EnergyChartWrapper({
  children,
  title = "Historique d'énergie",
  description,
  className,
  isLoading = false,
  controls,
  dateSelector
}: EnergyChartWrapperProps) {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-end">
            {dateSelector}
            {controls && (
              <div className="flex flex-wrap gap-2">
                {controls}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Chargement des données...</span>
            </div>
          ) : (
            children
          )}
        </div>
      </CardContent>
    </Card>
  );
}
