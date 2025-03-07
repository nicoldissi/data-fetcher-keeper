
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
                <circle cx="50" cy="50" r="45" className="fill-white stroke-gray-200 stroke-[10]" />
                
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
                <circle cx="50" cy="50" r="45" className="fill-white stroke-gray-200 stroke-[10]" />
                
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
                <circle cx="50" cy="50" r="45" className="fill-white stroke-gray-200 stroke-[10]" />
                
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
          
          {/* Connection Lines as elegant curved SVG paths with animations */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }}>
            <defs>
              {/* Gradient definitions for flow paths */}
              <linearGradient id="gradientGreen" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
              
              <linearGradient id="gradientOrange" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#fb923c" />
              </linearGradient>
              
              <linearGradient id="gradientGray" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6b7280" />
                <stop offset="100%" stopColor="#9ca3af" />
              </linearGradient>
              
              {/* Arrow marker definitions with better shape */}
              <marker
                id="arrowGreen"
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
                className="fill-green-500"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" />
              </marker>
              
              <marker
                id="arrowGray"
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
                className="fill-gray-500"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" />
              </marker>
              
              {/* Animation definitions */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            
            {/* Animated stylized curves */}
            <style>
              {`
                @keyframes flowDash {
                  to {
                    stroke-dashoffset: -100;
                  }
                }
                
                .flow-path {
                  stroke-width: 2.5;
                  fill: none;
                  stroke-linecap: round;
                  stroke-dasharray: 10, 5;
                  animation: flowDash 4s linear infinite;
                }
                
                .flow-path-bg {
                  stroke-width: 3.5;
                  fill: none;
                  stroke-opacity: 0.15;
                  stroke-linecap: round;
                }
              `}
            </style>
            
            {/* PV to Home (curved, attractive path) */}
            <path 
              className="flow-path-bg" 
              d="M 200,80 C 270,120 320,150 330,200" 
              stroke="url(#gradientGreen)" 
            />
            <path 
              className="flow-path" 
              d="M 200,80 C 270,120 320,150 330,200" 
              stroke="url(#gradientGreen)" 
              markerEnd="url(#arrowGreen)"
              filter="url(#glow)"
            />
            
            {/* PV to Grid (curved) */}
            <path 
              className="flow-path-bg" 
              d="M 200,80 C 120,130 70,150 60,200" 
              stroke="url(#gradientGreen)" 
            />
            <path 
              className="flow-path" 
              d="M 200,80 C 120,130 70,150 60,200" 
              stroke="url(#gradientGreen)" 
              markerEnd="url(#arrowGreen)"
              filter="url(#glow)"
            />
            
            {/* Grid to Consumption (curved) */}
            <path 
              className="flow-path-bg" 
              d="M 70,220 C 110,260 280,260 330,220" 
              stroke="url(#gradientGray)" 
            />
            <path 
              className="flow-path" 
              d="M 70,220 C 110,260 280,260 330,220" 
              stroke="url(#gradientGray)" 
              markerEnd="url(#arrowGray)"
              filter="url(#glow)"
            />
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}
