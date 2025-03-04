
import { useState, useEffect } from 'react';
import { useShellyData } from '@/hooks/useShellyData';
import { formatDistanceToNow } from 'date-fns';
import { DeviceStatus } from './DeviceStatus';
import { EnergyChart } from './EnergyChart';
import { DataTable } from './DataTable';
import { ShellyConfigForm } from './ShellyConfigForm';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Settings } from 'lucide-react';
import { isShellyConfigValid } from '@/lib/api';
import { DailyTotals } from './DailyTotals';
import { EnergyFlowChartDark } from './EnergyFlowChartDark';
import { SelfConsumptionCard } from './SelfConsumptionCard';
import { PowerTriangleCard } from './PowerTriangleCard';
import { UserMenu } from './UserMenu';

export function ShellyDashboard() {
  const [showConfig, setShowConfig] = useState<boolean>(!isShellyConfigValid());
  const { currentData, isLoading, error, lastStored, history, stats } = useShellyData();
  
  const lastUpdated = currentData 
    ? formatDistanceToNow(new Date(currentData.timestamp), { addSuffix: true }) 
    : 'Never';
  const handleConfigClick = () => {
    setShowConfig(true);
  };
  
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
              Données en temps réel de votre appareil Shelly EM
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <UserMenu />
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleConfigClick}>
              <Settings className="h-4 w-4" />
              <span>Paramètres</span>
            </Button>
          </div>
        </div>
        
        <Separator className="my-6" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="md:col-span-1 space-y-6">
            <DeviceStatus 
              data={currentData} 
              lastUpdated={lastUpdated} 
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
          <DailyTotals data={currentData} />
        </div>
        
        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="chart">Graphique</TabsTrigger>
            <TabsTrigger value="data">Tableau de Données</TabsTrigger>
          </TabsList>
          <TabsContent value="chart" className="mt-6">
            <EnergyChart data={history} />
          </TabsContent>
          <TabsContent value="data" className="mt-6">
            <DataTable data={history} />
          </TabsContent>
        </Tabs>
        
      </div>
    </div>
  );
}
