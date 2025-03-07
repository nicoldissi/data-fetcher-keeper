
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Sun, Home, Zap } from 'lucide-react';
import { useDailyEnergyTotals } from '@/hooks/useDailyEnergyTotals';
import { cn } from '@/lib/utils';

interface DailyEnergyFlowProps {
  configId?: string;
  className?: string;
}

export function DailyEnergyFlow({ configId, className }: DailyEnergyFlowProps) {
  const { dailyTotals, loading } = useDailyEnergyTotals(configId);
  
  // Convert Wh to kWh with 2 decimal places
  const toKWh = (wh: number) => (wh / 1000).toFixed(2);
  
  // Calculate additional metrics
  const pvTotal = dailyTotals.production;
  const gridImportTotal = dailyTotals.consumption - (dailyTotals.production - dailyTotals.injection);
  const gridExportTotal = dailyTotals.injection;
  const consumptionTotal = dailyTotals.consumption;
  
  // Calculate percentages
  const pvToLoads = pvTotal - gridExportTotal;
  const pvToLoadsPercent = pvTotal > 0 ? (pvToLoads / pvTotal * 100).toFixed(2) : "0";
  const pvToGridPercent = pvTotal > 0 ? (gridExportTotal / pvTotal * 100).toFixed(2) : "0";
  
  const gridToLoadsPercent = gridImportTotal > 0 ? "100" : "0";
  
  const consumptionFromPvPercent = consumptionTotal > 0 ? (pvToLoads / consumptionTotal * 100).toFixed(2) : "0";
  const consumptionFromGridPercent = consumptionTotal > 0 ? (gridImportTotal / consumptionTotal * 100).toFixed(2) : "0";
  
  if (loading) {
    return (
      <Card className={cn("overflow-hidden backdrop-blur-sm bg-white/90 border-0 shadow-md", className)}>
        <CardContent className="p-6">
          <div className="h-96 flex items-center justify-center">
            <p className="text-gray-500">Chargement des données journalières...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={cn("overflow-hidden backdrop-blur-sm bg-white/90 border-0 shadow-md", className)}>
      <CardContent className="p-6">
        <h3 className="text-lg font-medium mb-6">Bilan Énergétique Journalier</h3>
        
        {/* Triangle layout with PV at the top */}
        <div className="relative h-[450px] w-full">
          {/* PV Section - Top */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 text-center">
            <div className="text-sm font-semibold mb-1">Production PV</div>
            <div className="text-lg font-bold">{toKWh(pvTotal)} kWh</div>
            
            {/* PV Circle */}
            <div className="relative w-32 h-32 mx-auto my-4">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Background Circle */}
                <circle cx="50" cy="50" r="45" className="fill-none stroke-gray-200 stroke-[10]" />
                
                {/* PV to Loads Segment (Green) */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  className="fill-none stroke-green-500 stroke-[10]" 
                  strokeDasharray={`${Number(pvToLoadsPercent) * 2.83} 283`}
                  strokeDashoffset="0"
                  transform="rotate(-90 50 50)"
                />
                
                {/* PV to Grid Segment (Light Green) */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  className="fill-none stroke-green-300 stroke-[10]" 
                  strokeDasharray={`${Number(pvToGridPercent) * 2.83} 283`}
                  strokeDashoffset={`${-Number(pvToLoadsPercent) * 2.83}`}
                  transform="rotate(-90 50 50)"
                />
                
                {/* Center Icon */}
                <foreignObject x="25" y="25" width="50" height="50">
                  <div className="flex items-center justify-center w-full h-full">
                    <Sun className="w-8 h-8 text-yellow-500" />
                  </div>
                </foreignObject>
              </svg>
            </div>
            
            {/* PV Legend */}
            <div className="text-xs space-y-1">
              <div className="flex items-center justify-center">
                <span className="w-3 h-3 inline-block bg-green-500 mr-1"></span>
                <span>Utilisé: {pvToLoadsPercent}%</span>
              </div>
              <div className="text-xs text-gray-500 text-center">{toKWh(pvToLoads)} kWh</div>
              
              <div className="flex items-center justify-center mt-1">
                <span className="w-3 h-3 inline-block bg-green-300 mr-1"></span>
                <span>Injecté: {pvToGridPercent}%</span>
              </div>
              <div className="text-xs text-gray-500 text-center">{toKWh(gridExportTotal)} kWh</div>
            </div>
          </div>
          
          {/* Grid Section - Bottom Left */}
          <div className="absolute bottom-0 left-0 md:left-1/4 transform md:-translate-x-1/4 w-40 text-center">
            <div className="text-sm font-semibold mb-1">Réseau</div>
            <div className="text-lg font-bold">{toKWh(gridImportTotal)} kWh</div>
            
            {/* Grid Circle */}
            <div className="relative w-32 h-32 mx-auto my-4">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Background Circle */}
                <circle cx="50" cy="50" r="45" className="fill-none stroke-gray-200 stroke-[10]" />
                
                {/* Grid to Loads Segment (Gray) */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  className="fill-none stroke-gray-500 stroke-[10]" 
                  strokeDasharray={`${Number(gridToLoadsPercent) * 2.83} 283`}
                  strokeDashoffset="0"
                  transform="rotate(-90 50 50)"
                />
                
                {/* Center Icon */}
                <foreignObject x="25" y="25" width="50" height="50">
                  <div className="flex items-center justify-center w-full h-full">
                    <Zap className="w-8 h-8 text-gray-700" />
                  </div>
                </foreignObject>
              </svg>
            </div>
            
            {/* Grid Legend */}
            <div className="text-xs space-y-1">
              <div className="flex items-center justify-center">
                <span className="w-3 h-3 inline-block bg-gray-500 mr-1"></span>
                <span>Importé: {gridToLoadsPercent}%</span>
              </div>
              <div className="text-xs text-gray-500 text-center">{toKWh(gridImportTotal)} kWh</div>
            </div>
          </div>
          
          {/* Consumption Section - Bottom Right */}
          <div className="absolute bottom-0 right-0 md:right-1/4 transform md:translate-x-1/4 w-40 text-center">
            <div className="text-sm font-semibold mb-1">Consommation</div>
            <div className="text-lg font-bold">{toKWh(consumptionTotal)} kWh</div>
            
            {/* Consumption Circle */}
            <div className="relative w-32 h-32 mx-auto my-4">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Background Circle */}
                <circle cx="50" cy="50" r="45" className="fill-none stroke-gray-200 stroke-[10]" />
                
                {/* Consumption from PV Segment (Orange) */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  className="fill-none stroke-orange-500 stroke-[10]" 
                  strokeDasharray={`${Number(consumptionFromPvPercent) * 2.83} 283`}
                  strokeDashoffset="0"
                  transform="rotate(-90 50 50)"
                />
                
                {/* Consumption from Grid Segment (Light Orange) */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  className="fill-none stroke-orange-300 stroke-[10]" 
                  strokeDasharray={`${Number(consumptionFromGridPercent) * 2.83} 283`}
                  strokeDashoffset={`${-Number(consumptionFromPvPercent) * 2.83}`}
                  transform="rotate(-90 50 50)"
                />
                
                {/* Center Icon */}
                <foreignObject x="25" y="25" width="50" height="50">
                  <div className="flex items-center justify-center w-full h-full">
                    <Home className="w-8 h-8 text-orange-500" />
                  </div>
                </foreignObject>
              </svg>
            </div>
            
            {/* Consumption Legend */}
            <div className="text-xs space-y-1">
              <div className="flex items-center justify-center">
                <span className="w-3 h-3 inline-block bg-orange-500 mr-1"></span>
                <span>Depuis PV: {consumptionFromPvPercent}%</span>
              </div>
              <div className="text-xs text-gray-500 text-center">{toKWh(pvToLoads)} kWh</div>
              
              <div className="flex items-center justify-center mt-1">
                <span className="w-3 h-3 inline-block bg-orange-300 mr-1"></span>
                <span>Depuis Réseau: {consumptionFromGridPercent}%</span>
              </div>
              <div className="text-xs text-gray-500 text-center">{toKWh(gridImportTotal)} kWh</div>
            </div>
          </div>
          
          {/* Connection Lines as SVG paths in Triangle formation */}
          <svg className="absolute inset-0 w-full h-full" style={{ zIndex: -1 }}>
            {/* PV to Grid Line (Left diagonal) */}
            <path 
              d="M 200,120 L 100,350" 
              className="stroke-green-300 stroke-2 fill-none"
              markerEnd="url(#arrowGreen)"
            />
            
            {/* PV to Consumption Line (Right diagonal) */}
            <path 
              d="M 200,120 L 300,350" 
              className="stroke-green-500 stroke-2 fill-none"
              markerEnd="url(#arrowGreen)"
            />
            
            {/* Grid to Consumption Line (Bottom horizontal) */}
            <path 
              d="M 100,350 L 300,350" 
              className="stroke-gray-500 stroke-2 fill-none"
              markerEnd="url(#arrowGray)"
            />
            
            {/* Arrow markers */}
            <defs>
              <marker
                id="arrowGreen"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="5"
                orient="auto"
                className="fill-green-500"
              >
                <path d="M0,0 L0,10 L10,5 L0,0" />
              </marker>
              <marker
                id="arrowGray"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="5"
                orient="auto"
                className="fill-gray-500"
              >
                <path d="M0,0 L0,10 L10,5 L0,0" />
              </marker>
            </defs>
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}
