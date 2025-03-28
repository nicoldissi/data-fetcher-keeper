
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
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  // Respond to window resize events to adjust flow paths
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const toKWh = (wh: number) => (wh / 1000).toFixed(2);
  
  // Ensure we have valid dailyTotals to work with
  const validTotals = dailyTotals || { 
    production: 0, 
    importFromGrid: 0, 
    injection: 0, 
    consumption: 0 
  };
  
  // Calculate values based on daily totals
  const pvTotal = validTotals.production;
  const gridImportTotal = validTotals.importFromGrid;
  const gridExportTotal = validTotals.injection;
  
  // PV to home consumption is what was produced minus what was exported
  const pvToLoads = Math.max(0, pvTotal - gridExportTotal);
  
  // Total home consumption is direct PV consumption plus grid import
  const consumptionTotal = pvToLoads + gridImportTotal;
  
  // Calculate percentage distributions
  const pvToLoadsPercent = pvTotal > 0 ? (pvToLoads / pvTotal * 100).toFixed(2) : "0";
  const pvToGridPercent = pvTotal > 0 ? (gridExportTotal / pvTotal * 100).toFixed(2) : "0";
  
  const gridToLoadsPercent = gridImportTotal > 0 ? "100" : "0";
  
  const consumptionFromPvPercent = consumptionTotal > 0 ? (pvToLoads / consumptionTotal * 100).toFixed(2) : "0";
  const consumptionFromGridPercent = consumptionTotal > 0 ? (gridImportTotal / consumptionTotal * 100).toFixed(2) : "0";
  
  // Determine layout mode based on screen width - adjust bezier curves accordingly
  const isMobile = windowWidth < 768;
  
  console.log('DailyEnergyFlow calculated values:', {
    pvTotal,
    gridImportTotal,
    gridExportTotal,
    pvToLoads,
    consumptionTotal,
    pvToLoadsPercent,
    pvToGridPercent,
    consumptionFromPvPercent,
    consumptionFromGridPercent,
    dailyTotals: validTotals
  });
  
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
        
        <div className="relative h-[450px] w-full">
          {/* PV Gauge (Top) */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 text-center">
            <div className="text-sm font-semibold mb-1">Production PV</div>
            <div className="text-lg font-bold">{toKWh(pvTotal)} kWh</div>
            
            <div className="relative w-32 h-32 mx-auto my-4">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="50" r="45" className="fill-white stroke-gray-200 stroke-[10]" />
                
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  className="fill-none stroke-green-500 stroke-[10]" 
                  strokeDasharray={`${Number(pvToLoadsPercent) * 2.83} 283`}
                  strokeDashoffset="0"
                  transform="rotate(-90 50 50)"
                />
                
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  className="fill-none stroke-green-300 stroke-[10]" 
                  strokeDasharray={`${Number(pvToGridPercent) * 2.83} 283`}
                  strokeDashoffset={`${-Number(pvToLoadsPercent) * 2.83}`}
                  transform="rotate(-90 50 50)"
                />
                
                <foreignObject x="25" y="25" width="50" height="50">
                  <div className="flex items-center justify-center w-full h-full">
                    <Sun className="w-8 h-8 text-yellow-500" />
                  </div>
                </foreignObject>
              </svg>
            </div>
            
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
          
          {/* Grid Gauge (Bottom Left) */}
          <div className={cn(
            "absolute bottom-0 transform w-40 text-center",
            isMobile ? "left-0" : "left-1/4 -translate-x-1/2"
          )}>
            <div className="text-sm font-semibold mb-1">Réseau</div>
            <div className="text-lg font-bold">{toKWh(gridImportTotal)} kWh</div>
            
            <div className="relative w-32 h-32 mx-auto my-4">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="50" r="45" className="fill-white stroke-gray-200 stroke-[10]" />
                
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  className="fill-none stroke-gray-500 stroke-[10]" 
                  strokeDasharray={`${Number(gridToLoadsPercent) * 2.83} 283`}
                  strokeDashoffset="0"
                  transform="rotate(-90 50 50)"
                />
                
                <foreignObject x="25" y="25" width="50" height="50">
                  <div className="flex items-center justify-center w-full h-full">
                    <Zap className="w-8 h-8 text-gray-700" />
                  </div>
                </foreignObject>
              </svg>
            </div>
            
            <div className="text-xs space-y-1">
              <div className="flex items-center justify-center">
                <span className="w-3 h-3 inline-block bg-gray-500 mr-1"></span>
                <span>Importé: {gridToLoadsPercent}%</span>
              </div>
              <div className="text-xs text-gray-500 text-center">{toKWh(gridImportTotal)} kWh</div>
            </div>
          </div>
          
          {/* Consumption Gauge (Bottom Right) */}
          <div className={cn(
            "absolute bottom-0 transform w-40 text-center",
            isMobile ? "right-0" : "right-1/4 translate-x-1/2"
          )}>
            <div className="text-sm font-semibold mb-1">Consommation</div>
            <div className="text-lg font-bold">{toKWh(consumptionTotal)} kWh</div>
            
            <div className="relative w-32 h-32 mx-auto my-4">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="50" r="45" className="fill-white stroke-gray-200 stroke-[10]" />
                
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  className="fill-none stroke-orange-500 stroke-[10]" 
                  strokeDasharray={`${Number(consumptionFromPvPercent) * 2.83} 283`}
                  strokeDashoffset="0"
                  transform="rotate(-90 50 50)"
                />
                
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  className="fill-none stroke-orange-300 stroke-[10]" 
                  strokeDasharray={`${Number(consumptionFromGridPercent) * 2.83} 283`}
                  strokeDashoffset={`${-Number(consumptionFromPvPercent) * 2.83}`}
                  transform="rotate(-90 50 50)"
                />
                
                <foreignObject x="25" y="25" width="50" height="50">
                  <div className="flex items-center justify-center w-full h-full">
                    <Home className="w-8 h-8 text-orange-500" />
                  </div>
                </foreignObject>
              </svg>
            </div>
            
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
          
          {/* SVG Flow Lines */}
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none z-0" 
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
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
              
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            
            <style>
              {`
                @keyframes flowDash {
                  to {
                    stroke-dashoffset: -100;
                  }
                }
                
                .flow-path {
                  stroke-width: 1;
                  fill: none;
                  stroke-linecap: round;
                  stroke-dasharray: 5, 3;
                  animation: flowDash 4s linear infinite;
                }
                
                .flow-path-bg {
                  stroke-width: 2;
                  fill: none;
                  stroke-opacity: 0.15;
                  stroke-linecap: round;
                }
              `}
            </style>
            
            {/* PV to Consumption (Right) Flow - Centered points */}
            <path 
              className="flow-path-bg" 
              d={isMobile 
                ? "M 50,30 C 50,55 80,55 80,70" 
                : "M 50,30 C 50,50 62.5,50 75,70"
              }
              stroke="url(#gradientGreen)" 
            />
            <path 
              className="flow-path" 
              d={isMobile 
                ? "M 50,30 C 50,55 80,55 80,70" 
                : "M 50,30 C 50,50 62.5,50 75,70"
              }
              stroke="url(#gradientGreen)" 
              markerEnd="url(#arrowGreen)"
              filter="url(#glow)"
            />
            
            {/* PV to Grid (Left) Flow - Centered points */}
            <path 
              className="flow-path-bg" 
              d={isMobile 
                ? "M 50,30 C 50,55 20,55 20,70" 
                : "M 50,30 C 50,50 37.5,50 25,70"
              }
              stroke="url(#gradientGreen)" 
            />
            <path 
              className="flow-path" 
              d={isMobile 
                ? "M 50,30 C 50,55 20,55 20,70" 
                : "M 50,30 C 50,50 37.5,50 25,70"
              }
              stroke="url(#gradientGreen)" 
              markerEnd="url(#arrowGreen)"
              filter="url(#glow)"
            />
            
            {/* Grid to Consumption Flow */}
            <path 
              className="flow-path-bg" 
              d={isMobile 
                ? "M 20,80 C 20,90 80,90 80,80" 
                : "M 25,80 C 25,90 75,90 75,80"
              }
              stroke="url(#gradientGray)" 
            />
            <path 
              className="flow-path" 
              d={isMobile 
                ? "M 20,80 C 20,90 80,90 80,80" 
                : "M 25,80 C 25,90 75,90 75,80"
              }
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
