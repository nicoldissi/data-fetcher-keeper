import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PowerTriangleCardProps {
  title: string;
  activePower?: number;
  reactivePower?: number;
  powerFactor?: number;
  emeterIndex?: number;
  activePower1?: number;
  reactivePower1?: number;
  powerFactor1?: number;
  activePower2?: number;
  reactivePower2?: number;
  powerFactor2?: number;
  className?: string;
}

export function PowerTriangleCard({
  title,
  activePower,
  reactivePower,
  powerFactor,
  emeterIndex = 0,
  activePower1,
  reactivePower1,
  powerFactor1,
  activePower2,
  reactivePower2,
  powerFactor2,
  className,
}: PowerTriangleCardProps) {
  // 1) Compatibilité ascendante des props
  const actualActivePower1 =
    activePower !== undefined ? activePower : activePower1;
  const actualReactivePower1 =
    reactivePower !== undefined ? reactivePower : reactivePower1;
  const actualPowerFactor1 =
    powerFactor !== undefined ? powerFactor : powerFactor1;

  // 2) Calcul des valeurs électriques (Grid / Réseau)
  const powerValues1 = {
    active: isNaN(actualActivePower1) ? 0 : Math.abs(actualActivePower1),
    reactive: isNaN(actualReactivePower1) ? 0 : Math.abs(actualReactivePower1),
    apparent:
      isNaN(actualActivePower1) || isNaN(actualReactivePower1)
        ? 0
        : Math.sqrt(
            Math.pow(Math.abs(actualActivePower1), 2) +
              Math.pow(Math.abs(actualReactivePower1), 2)
          ),
    powerFactor: isNaN(actualPowerFactor1) ? 0 : Math.abs(actualPowerFactor1),
  };

  // 3) Paramètres pour le quarter circle
  const cx = 50; // centre X
  const cy = 350; // centre Y
  const R = 300; // rayon

  // 4) Pour qu'un PF=1 => sommet = (350,350)
  //    Pour qu'un PF=0 => sommet = (50,50)
  //    On définit φ = acos(PF) dans [0.. π/2]
  //    apex = (cx + R*cos(φ), cy - R*sin(φ))
  const PF1 = Math.max(0, Math.min(1, powerValues1.powerFactor));
  const phi = Math.acos(PF1); // angle en radians
  const apexX = cx + R * Math.cos(phi);
  const apexY = cy - R * Math.sin(phi);

  return (
    <Card
      className={cn(
        "overflow-hidden backdrop-blur-sm bg-white/90 border-0 shadow-md h-full",
        className
      )}
    >
      <CardHeader className="py-2">
        <CardTitle className="text-lg font-medium flex items-center">
          <span className="bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded mr-2">
            EMETERS
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 px-4">
        <div className="relative">
          <div className="h-[370px] w-full">
            <svg viewBox="0 0 450 400" className="w-full h-full" style={{ transform: 'scale(0.75) translateX(55px) translateY(-35px)', transformOrigin: 'top left' }}>
              {/* Quarter circle (inchangé) */}
              <path
                d="M 350,350 A 300,300 0 0 0 50,50"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="4"
              />

              {/* Triangle avec nouvelles couleurs */}
              {/* Côté adjacent (horizontal) en vert */}
              <path
                d={`M ${cx},${cy} L ${apexX},${cy}`}
                fill="none"
                stroke="#22c55e"
                strokeWidth="3"
              />
              
              {/* Côté opposé (vertical) en rouge */}
              <path
                d={`M ${apexX},${cy} L ${apexX},${apexY}`}
                fill="none"
                stroke="#ef4444"
                strokeWidth="3"
              />
              
              {/* Hypoténuse en violet */}
              <path
                d={`M ${cx},${cy} L ${apexX},${apexY}`}
                fill="none"
                stroke="#8E44AD"
                strokeWidth="3"
              />
              
              {/* Remplissage du triangle */}
              <path
                d={`M ${cx},${cy} L ${apexX},${cy} L ${apexX},${apexY} Z`}
                fill="#8E44AD"
                fillOpacity="0.05"
              />

              {/* Étiquettes avec vignettes blanches arrondies et texte sur deux lignes */}
              {/* Active Power (côté horizontal, vert) */}
              <rect
                x={(cx + apexX) / 2 - 50}
                y={cy + 10}
                width="100"
                height="40"
                rx="12"
                ry="12"
                fill="white"
                stroke="#22c55e"
                strokeWidth="1"
              />
              <text
                x={(cx + apexX) / 2}
                y={cy + 26}
                textAnchor="middle"
                fontSize="14"
                fill="#22c55e"
                fontWeight="500"
              >
                Active
              </text>
              <text
                x={(cx + apexX) / 2}
                y={cy + 42}
                textAnchor="middle"
                fontSize="14"
                fill="#22c55e"
                fontWeight="500"
              >
                {powerValues1.active.toFixed(0)} W
              </text>
              
              {/* Reactive Power (côté vertical, rouge) */}
              <rect
                x={apexX + 5}
                y={(cy + apexY) / 2 - 20}
                width="110"
                height="40"
                rx="12"
                ry="12"
                fill="white"
                stroke="#ef4444"
                strokeWidth="1"
              />
              <text
                x={apexX + 60}
                y={(cy + apexY) / 2 - 4}
                textAnchor="middle"
                fontSize="14"
                fill="#ef4444"
                fontWeight="500"
              >
                Reactive
              </text>
              <text
                x={apexX + 60}
                y={(cy + apexY) / 2 + 12}
                textAnchor="middle"
                fontSize="14"
                fill="#ef4444"
                fontWeight="500"
              >
                {powerValues1.reactive.toFixed(0)} VAR
              </text>
              
              {/* Apparent Power (hypoténuse, violet) */}
              <rect
                x={(cx + apexX) / 2 - 55}
                y={(cy + apexY) / 2 - 20}
                width="110"
                height="40"
                rx="12"
                ry="12"
                fill="white"
                stroke="#8E44AD"
                strokeWidth="1"
              />
              <text
                x={(cx + apexX) / 2}
                y={(cy + apexY) / 2 - 4}
                textAnchor="middle"
                fontSize="14"
                fill="#8E44AD"
                fontWeight="500"
              >
                Apparent
              </text>
              <text
                x={(cx + apexX) / 2}
                y={(cy + apexY) / 2 + 12}
                textAnchor="middle"
                fontSize="14"
                fill="#8E44AD"
                fontWeight="500"
              >
                {powerValues1.apparent.toFixed(0)} VA
              </text>
              
              {/* Power Factor (près du centre) */}
              <rect
                x={cx + 5}
                y={cy - 40}
                width="70"
                height="36"
                rx="12"
                ry="12"
                fill="white"
                stroke="#8E44AD"
                strokeWidth="1"
              />
              <text
                x={cx + 40}
                y={cy - 24}
                textAnchor="middle"
                fontSize="14"
                fontWeight="bold"
                fill="#8E44AD"
              >
                PF
              </text>
              <text
                x={cx + 40}
                y={cy - 8}
                textAnchor="middle"
                fontSize="14"
                fontWeight="bold"
                fill="#8E44AD"
              >
                {PF1.toFixed(2)}
              </text>
            </svg>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
