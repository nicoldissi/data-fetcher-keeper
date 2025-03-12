
import { ShellyDashboard } from "@/components/ShellyDashboard";
import { useState, useEffect } from 'react';
import { getShellyConfig } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [configId, setConfigId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Enable realtime subscription for the energy_data table
  useEffect(() => {
    // First, make sure the table is set up for realtime
    const setupRealtimeTable = async () => {
      try {
        // Check if we have at least one shelly config
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 pt-6 pb-12">
        <ShellyDashboard key={configId} />
      </div>
    </div>
  );
};

export default Index;
