import { useEffect, useRef } from 'react';
import { ShellyEMData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EnergyFlowChartProps {
  data: ShellyEMData | null;
  className?: string;
}

export function EnergyFlowChart({ data, className }: EnergyFlowChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    // Update flow animations based on current power values
    const gridFlow = data.power;
    const solarFlow = data.production_power;
    const homeConsumption = Math.abs(gridFlow) + solarFlow;

    // Update path animations
    const gridPath = svgRef.current.querySelector('#gridPath');
    const solarPath = svgRef.current.querySelector('#solarPath');
    const homePath = svgRef.current.querySelector('#homePath');

    if (gridPath && solarPath && homePath) {
      // Adjust animation speed based on power values
      const getAnimationDuration = (power: number) => {
        const absValue = Math.abs(power);
        return Math.max(2, Math.min(10, 20000 / (absValue + 100)));
      };

      gridPath.style.animation = `flowAnimation ${getAnimationDuration(gridFlow)}s linear infinite`;
      solarPath.style.animation = `flowAnimation ${getAnimationDuration(solarFlow)}s linear infinite`;
      homePath.style.animation = `flowAnimation ${getAnimationDuration(homeConsumption)}s linear infinite`;

      // Update path colors based on flow direction
      gridPath.setAttribute('stroke', gridFlow >= 0 ? '#ef4444' : '#10b981');
      solarPath.setAttribute('stroke', '#f59e0b');
      homePath.setAttribute('stroke', '#6366f1');
    }
  }, [data]);

  return (
    <Card className={cn("overflow-hidden backdrop-blur-sm bg-white/90 border-0 shadow-md", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center">
          <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded mr-2">TEMPS RÉEL</span>
          Flux d'Énergie
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center p-6">
        <div className="relative w-full max-w-md aspect-square">
          <svg
            ref={svgRef}
            viewBox="0 0 400 400"
            className="w-full h-full"
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
              </marker>
            </defs>
            
            <style>
              {`
                @keyframes flowAnimation {
                  0% { stroke-dashoffset: 1000; }
                  100% { stroke-dashoffset: 0; }
                }
                .flow-path {
                  stroke-width: 3;
                  stroke-dasharray: 10, 5;
                  marker-end: url(#arrowhead);
                }
                .node-circle {
                  fill: white;
                  stroke-width: 2;
                }
                .node-text {
                  font-size: 14px;
                  font-weight: 500;
                  text-anchor: middle;
                  dominant-baseline: middle;
                }
                .power-text {
                  font-size: 12px;
                  font-weight: 400;
                  text-anchor: middle;
                  dominant-baseline: middle;
                }
              `}
            </style>

            {/* Grid Node */}
            <g transform="translate(50, 200)">
              <circle className="node-circle" cx="0" cy="0" r="40" stroke="#94a3b8" />
              <text className="node-text" fill="#64748b">Réseau</text>
              <text className="power-text" y="20" fill="#64748b">
                {data ? `${Math.abs(data.power).toFixed(1)} W` : '0 W'}
              </text>
            </g>

            {/* Solar Node */}
            <g transform="translate(200, 50)">
              <circle className="node-circle" cx="0" cy="0" r="40" stroke="#f59e0b" />
              <text className="node-text" fill="#d97706">Photovoltaïque</text>
              <text className="power-text" y="20" fill="#d97706">
                {data ? `${data.production_power.toFixed(1)} W` : '0 W'}
              </text>
            </g>

            {/* Home Node */}
            <g transform="translate(350, 200)">
              <circle className="node-circle" cx="0" cy="0" r="40" stroke="#6366f1" />
              <text className="node-text" fill="#4f46e5">Maison</text>
              <text className="power-text" y="20" fill="#4f46e5">
                {data ? `${(Math.abs(data.power) + data.production_power).toFixed(1)} W` : '0 W'}
              </text>
            </g>

            {/* Flow Paths */}
            <path
              id="gridPath"
              className="flow-path"
              d="M 90,200 L 310,200"
              stroke="#ef4444"
            />
            <path
              id="solarPath"
              className="flow-path"
              d="M 200,90 L 200,200 L 310,200"
              stroke="#f59e0b"
            />
            <path
              id="homePath"
              className="flow-path"
              d="M 310,200 L 310,200"
              stroke="#6366f1"
            />
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}