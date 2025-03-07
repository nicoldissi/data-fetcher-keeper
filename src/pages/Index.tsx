import { ShellyDashboard } from "@/components/ShellyDashboard";
import { SelfConsumptionCard } from "@/components/SelfConsumptionCard";
import { SelfProductionCard } from "@/components/SelfProductionCard";
import { useServerShellyData } from "@/hooks/useServerShellyData";
import { getShellyConfig } from "@/lib/api";
import { useState, useEffect } from 'react';

const Index = () => {
  const [configId, setConfigId] = useState<string | undefined>();
  const [config, setConfig] = useState(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadConfig = async () => {
      if (configId) {
        const configData = await getShellyConfig(configId);
        setConfig(configData);
      }
    };
    loadConfig();
  }, [configId]);
  
  const { currentData, isLoading } = useServerShellyData(config);

  useEffect(() => {
    const fetchConfig = async () => {
      let config = null;
      try {
        config = await getShellyConfig();
        if (config?.id) {
          setConfigId(config.id);
        } else {
          setError("No Shelly configuration found.");
        }
      } catch (err) {
        setError("Failed to load Shelly configuration.");
      } finally {
        console.log("Fetched config:", config);
        console.log("Config ID:", config?.id);
      }
    };

    fetchConfig();
  }, []);

  useEffect(() => {
  }, [configId]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!configId) {
    return <div>No Shelly configuration found.</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 pt-6 pb-12">
        <ShellyDashboard key={configId} />
      </div>
    </div>
  );
};

export default Index;
