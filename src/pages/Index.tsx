
import { useState, useEffect } from 'react';
import { getShellyConfig } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarFooter,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { DeviceStatus } from "@/components/DeviceStatus";
import { EnergyFlowChartDark } from "@/components/EnergyFlowChartDark";
import { SelfConsumptionCard } from "@/components/SelfConsumptionCard";
import { SelfProductionCard } from "@/components/SelfProductionCard";
import { PowerTriangleCard } from "@/components/PowerTriangleCard";
import { HistoricalEnergyChart, VisxEnergyChart } from "@/components/charts";
import { UserMenu } from "@/components/UserMenu";
import { Activity, Zap, BarChart3, Gauge, ChartLine, Triangle, Menu } from "lucide-react";
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { cn } from '@/lib/utils';
import { ShellyConfigForm } from "@/components/ShellyConfigForm";

const Index = () => {
  const [configId, setConfigId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("device-status");
  
  useEffect(() => {
    const setupRealtimeTable = async () => {
      try {
        const { data, error } = await supabase
          .from('shelly_configs')
          .select('id')
          .limit(1);
        
        if (error) {
          console.error('Error fetching shelly configs:', error);
          return;
        }
        
        if (!data || data.length === 0) {
          console.log('No Shelly configurations found in database');
          return;
        }
        
        console.log('Realtime setup complete');
      } catch (err) {
        console.error('Error setting up realtime:', err);
      }
    };
    
    setupRealtimeTable();
  }, []);
  
  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const config = await getShellyConfig();
        if (config?.id) {
          setConfigId(config.id);
          console.log("Fetched config:", config);
          console.log("Config ID:", config.id);
        } else {
          setError("No Shelly configuration found.");
        }
      } catch (err) {
        console.error("Failed to load Shelly configuration:", err);
        setError("Failed to load Shelly configuration.");
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const { 
    currentData, 
    isLoading, 
    error: realtimeError, 
    history, 
    deviceConfig
  } = useSupabaseRealtime(configId || undefined);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Chargement...</h2>
          <p className="text-muted-foreground">Récupération des données du moniteur d'énergie</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Erreur</h2>
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!configId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Aucune configuration trouvée</h2>
          <p className="text-muted-foreground">Veuillez configurer votre appareil Shelly</p>
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

  const renderSection = () => {
    switch (activeSection) {
      case "device-status":
        return (
          <DeviceStatus 
            data={currentData} 
            lastUpdated={currentData ? new Date(currentData.timestamp).toLocaleString() : 'Jamais'} 
            configId={configId} 
            className="w-full h-full"
          />
        );
      case "energy-flow":
        return (
          <EnergyFlowChartDark 
            data={currentData} 
            configId={configId}
            className="w-full h-full" 
          />
        );
      case "self-consumption":
        return (
          <SelfConsumptionCard 
            data={currentData} 
            configId={configId}
            className="w-full h-full" 
          />
        );
      case "self-production":
        return (
          <SelfProductionCard 
            data={currentData} 
            configId={configId}
            className="w-full h-full" 
          />
        );
      case "chart":
        return (
          <VisxEnergyChart 
            history={history} 
            configId={configId}
          />
        );
      case "power-triangle":
        return (
          <PowerTriangleCard
            title="Triangle Apparent x Actif x Réactif"
            activePower={currentData?.power || 0}
            reactivePower={currentData?.reactive || 0}
            powerFactor={currentData?.pf || 0}
            emeterIndex={0}
            className="w-full h-full"
          />
        );
      default:
        return (
          <DeviceStatus 
            data={currentData} 
            lastUpdated={currentData ? new Date(currentData.timestamp).toLocaleString() : 'Jamais'} 
            configId={configId} 
            className="w-full h-full"
          />
        );
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950">
        <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-950 border-b p-2 flex items-center justify-between md:px-6">
          <div className="flex items-center">
            <SidebarTrigger className="md:hidden mr-2" />
            <h3 className="text-lg font-semibold tracking-tight">Moniteur d'Énergie</h3>
          </div>
          <UserMenu />
        </div>

        <Sidebar>
          <SidebarHeader className="border-b mt-12 md:mt-0">
            <div className="px-2 py-2">
              <p className="text-sm text-muted-foreground">
                {deviceConfig?.name || 'Appareil Shelly EM'}
              </p>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu className="bg-white dark:bg-gray-900 md:bg-transparent">
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection("device-status")}
                  isActive={activeSection === "device-status"}
                >
                  <Activity className="mr-2 h-5 w-5" />
                  <span>Device Status</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection("energy-flow")}
                  isActive={activeSection === "energy-flow"}
                >
                  <Zap className="mr-2 h-5 w-5" />
                  <span>Flux d'énergie</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection("self-consumption")}
                  isActive={activeSection === "self-consumption"}
                >
                  <Gauge className="mr-2 h-5 w-5" />
                  <span>Taux autoconsommation</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection("self-production")}
                  isActive={activeSection === "self-production"}
                >
                  <BarChart3 className="mr-2 h-5 w-5" />
                  <span>Taux Autoproduction</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection("chart")}
                  isActive={activeSection === "chart"}
                >
                  <ChartLine className="mr-2 h-5 w-5" />
                  <span>Graphique</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveSection("power-triangle")}
                  isActive={activeSection === "power-triangle"}
                >
                  <Triangle className="mr-2 h-5 w-5" />
                  <span>Triangle apparent</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <div className="flex-1 p-6 md:p-8 mt-12">
          <div className="h-[calc(100vh-7rem)] max-w-full mx-auto">
            {renderSection()}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
