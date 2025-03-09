
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PowerTrianglePVCardProps {
  title: string;
  activePower?: number;
  reactivePower?: number;
  powerFactor?: number;
  className?: string;
}

export function PowerTrianglePVCard({
  title,
  activePower = 0,
  reactivePower = 0,
  powerFactor = 0,
  className,
}: PowerTrianglePVCardProps) {
  // Calcul des valeurs électriques pour le PV
  const powerValues = {
    active: isNaN(activePower) ? 0 : Math.abs(activePower),
    reactive: isNaN(reactivePower) ? 0 : Math.abs(reactivePower),
    apparent:
      isNaN(activePower) || isNaN(reactivePower)
        ? 0
        : Math.sqrt(
            Math.pow(Math.abs(activePower), 2) +
              Math.pow(Math.abs(reactivePower), 2)
          ),
    powerFactor: isNaN(powerFactor) ? 0 : Math.abs(powerFactor),
  };

  // Paramètres pour le quarter circle
  const cx = 50; // centre X
  const cy = 350; // centre Y
  const R = 300; // rayon

  // Pour qu'un PF=1 => sommet = (350,350)
  // Pour qu'un PF=0 => sommet = (50,50)
  // On définit φ = acos(PF) dans [0.. π/2]
  // apex = (cx + R*cos(φ), cy - R*sin(φ))
  const PF = Math.max(0, Math.min(1, powerValues.powerFactor));
  const phi = Math.acos(PF); // angle en radians
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
          <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded mr-2">
            PV
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 px-4">
        <div className="relative">
          <div className="h-[370px] w-full">
            <svg viewBox="0 0 400 400" className="w-full h-full">
              {/* Quarter circle */}
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
              
              {/* Hypoténuse en vert */}
              <path
                d={`M ${cx},${cy} L ${apexX},${apexY}`}
                fill="none"
                stroke="#22c55e"
                strokeWidth="3"
              />
              
              {/* Remplissage du triangle */}
              <path
                d={`M ${cx},${cy} L ${apexX},${cy} L ${apexX},${apexY} Z`}
                fill="#22c55e"
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
                {powerValues.active.toFixed(0)} W
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
                {powerValues.reactive.toFixed(0)} VAR
              </text>
              
              {/* Apparent Power (hypoténuse, vert) */}
              <rect
                x={(cx + apexX) / 2 - 55}
                y={(cy + apexY) / 2 - 20}
                width="110"
                height="40"
                rx="12"
                ry="12"
                fill="white"
                stroke="#22c55e"
                strokeWidth="1"
              />
              <text
                x={(cx + apexX) / 2}
                y={(cy + apexY) / 2 - 4}
                textAnchor="middle"
                fontSize="14"
                fill="#22c55e"
                fontWeight="500"
              >
                Apparent
              </text>
              <text
                x={(cx + apexX) / 2}
                y={(cy + apexY) / 2 + 12}
                textAnchor="middle"
                fontSize="14"
                fill="#22c55e"
                fontWeight="500"
              >
                {powerValues.apparent.toFixed(0)} VA
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
                stroke="#22c55e"
                strokeWidth="1"
              />
              <text
                x={cx + 40}
                y={cy - 24}
                textAnchor="middle"
                fontSize="14"
                fontWeight="bold"
                fill="#22c55e"
              >
                PF
              </text>
              <text
                x={cx + 40}
                y={cy - 8}
                textAnchor="middle"
                fontSize="14"
                fontWeight="bold"
                fill="#22c55e"
              >
                {PF.toFixed(2)}
              </text>
            </svg>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
