import { useState, useEffect } from 'react';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { getShellyConfig, isShellyConfigValid } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { DeviceStatus } from './DeviceStatus';
import { HistoricalEnergyChart } from './charts';
import { DataTable } from './DataTable';
import { ShellyConfigForm } from './ShellyConfigForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { EnergyFlowChartDark } from './EnergyFlowChartDark';
import { SelfConsumptionCard } from './SelfConsumptionCard';
import { SelfProductionCard } from './SelfProductionCard';
import { PowerTriangleCard } from './PowerTriangleCard';
import { UserMenu } from './UserMenu';
import { ShellyConfig } from '@/lib/types';
import { DailyEnergyFlow } from './DailyEnergyFlow';

const isDevelopment = process.env.NODE_ENV === 'development';

const debugLog = (message: string, ...args: unknown[]) => {
  if (isDevelopment) {
    console.log(message, ...args);
  }
};

export function ShellyDashboard() {
  const [showConfig, setShowConfig] = useState(false);
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const checkConfigValidity = async () => {
      try {
        const isValid = await isShellyConfigValid();
        setShowConfig(!isValid);
        if (isValid) {
          const config = await getShellyConfig();
          if (config && config.id) {
            setActiveConfigId(config.id);
          }
        }
      } catch (error) {
        console.error('Error checking config validity:', error);
      } finally {
        setIsInitializing(false);
      }
    };
    checkConfigValidity();
  }, []);

  const { 
    currentData, 
    isLoading, 
    error, 
    history, 
    deviceConfig,
    isConfigValid,
    stats 
  } = useSupabaseRealtime(activeConfigId || undefined);

  useEffect(() => {
    if (currentData && isDevelopment) {
      debugLog('ShellyDashboard - Power values:', {
        grid_power: currentData.power,
        production_power: currentData.production_power,
        total_consumption: currentData.power + currentData.production_power
      });
    }
  }, [currentData]);

  const lastUpdated = currentData
    ? formatDistanceToNow(new Date(currentData.timestamp), { addSuffix: true })
    : 'Never';

  const handleConfigClick = () => {
    setShowConfig(true);
  };

  if (isInitializing) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-6">Moniteur d'Énergie</h1>
        <div className="text-center text-muted-foreground">
          <p>Initialisation...</p>
        </div>
      </div>
    );
  }

  if (showConfig) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-6">Moniteur d'Énergie</h1>
        <ShellyConfigForm onConfigured={() => setShowConfig(false)} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="space-y-1 mb-4 md:mb-0">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Moniteur d'Énergie</h1>
            <p className="text-muted-foreground">
              {deviceConfig?.name ? `Données en temps réel de ${deviceConfig.name}` : 'Données en temps réel de votre appareil Shelly EM'}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <UserMenu />
          </div>
        </div>

        <Separator className="my-6" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="md:col-span-1 space-y-6">
            <DeviceStatus
              data={currentData}
              lastUpdated={lastUpdated}
              configId={activeConfigId}
            />

            {currentData && (
              <div className="grid grid-cols-1 gap-6">
                <PowerTriangleCard
                  title="Power Triangle - Grid"
                  activePower={currentData.power}
                  reactivePower={currentData.reactive}
                  powerFactor={currentData.pf}
                  emeterIndex={0}
                />
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <EnergyFlowChartDark data={currentData} />
          </div>
        </div>
        
        <div className="mb-6">
          <DailyEnergyFlow configId={activeConfigId} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <SelfConsumptionCard data={currentData} configId={activeConfigId} />
          <SelfProductionCard data={currentData} configId={activeConfigId} />
        </div>

        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="chart">Graphique</TabsTrigger>
            <TabsTrigger value="data">Tableau de Données</TabsTrigger>
          </TabsList>
          <TabsContent value="chart" className="mt-6">
            <HistoricalEnergyChart history={history} configId={activeConfigId} />
          </TabsContent>
          <TabsContent value="data" className="mt-6">
            <DataTable data={history} configId={activeConfigId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
