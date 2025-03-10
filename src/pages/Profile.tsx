
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { getShellyConfigs, updateShellyConfig, deleteShellyConfig } from "@/lib/api";
import { ShellyConfig } from "@/lib/types";
import { UserProfileCard } from "@/components/profile/UserProfileCard";
import { ShellyConfigList } from "@/components/profile/ShellyConfigList";
import { RoofSections } from "@/components/profile/RoofSections";

export default function Profile() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  
  // Shelly configurations state
  const [shellyConfigs, setShellyConfigs] = useState<ShellyConfig[]>([]);
  const [savingConfig, setSavingConfig] = useState<string | null>(null);
  const [deletingConfig, setDeletingConfig] = useState<string | null>(null);
  const [newConfig, setNewConfig] = useState<boolean>(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email);
        setIsAuthenticated(true);
      } else {
        navigate("/auth");
      }
      setLoading(false);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUserEmail(session.user.email);
          setIsAuthenticated(true);
        } else {
          navigate("/auth");
        }
      }
    );

    // Load Shelly configurations
    const loadShellyConfigs = async () => {
      const configs = await getShellyConfigs();
      setShellyConfigs(configs);
    };
    
    loadShellyConfigs();

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleUpdateConfig = async (index: number) => {
    const config = shellyConfigs[index];
    setSavingConfig(config.id || "new");
    
    try {
      console.log('Updating config:', config); // Debug log
      const updatedConfig = await updateShellyConfig({
        id: config.id,
        deviceId: config.deviceId?.trim() || '',
        apiKey: config.apiKey?.trim() || '',
        serverUrl: config.serverUrl?.trim() || '',
        name: config.name?.trim() || `Appareil ${index + 1}`,
        deviceType: config.deviceType || 'ShellyEM',
        inverter_power_kva: config.inverter_power_kva || 3.0,
        grid_subscription_kva: config.grid_subscription_kva || 6.0,
        latitude: config.latitude || null,
        longitude: config.longitude || null
      });
      
      if (updatedConfig) {
        console.log('Config updated successfully:', updatedConfig); // Debug log
        const newConfigs = [...shellyConfigs];
        newConfigs[index] = updatedConfig;
        setShellyConfigs(newConfigs);
        
        if (newConfig) {
          setNewConfig(false);
        }
      }
      
      toast({
        title: "Configuration enregistrée",
        description: "Les paramètres de votre appareil Shelly ont été mis à jour"
      });
    } catch (error) {
      console.error("Error saving Shelly config:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement de la configuration"
      });
    } finally {
      setSavingConfig(null);
    }
  };

  const handleDeleteConfig = async (id: string, index: number) => {
    setDeletingConfig(id);
    
    try {
      const success = await deleteShellyConfig(id);
      
      if (success) {
        // Remove the config from the list
        const newConfigs = [...shellyConfigs];
        newConfigs.splice(index, 1);
        setShellyConfigs(newConfigs);
        
        toast({
          title: "Configuration supprimée",
          description: "L'appareil Shelly a été supprimé avec succès"
        });
      } else {
        throw new Error("Failed to delete configuration");
      }
    } catch (error) {
      console.error("Error deleting Shelly config:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression de la configuration"
      });
    } finally {
      setDeletingConfig(null);
    }
  };

  const handleAddNewConfig = () => {
    const newConfigItem: ShellyConfig = {
      deviceId: "",
      apiKey: "",
      serverUrl: "https://shelly-12-eu.shelly.cloud",
      name: `Appareil ${shellyConfigs.length + 1}`,
      deviceType: "ShellyEM",
      inverter_power_kva: 3.0,
      grid_subscription_kva: 6.0,
      latitude: null,
      longitude: null
    };
    
    setShellyConfigs([...shellyConfigs, newConfigItem]);
    setNewConfig(true);
  };

  const updateConfigField = (index: number, field: keyof ShellyConfig, value: any) => {
    const newConfigs = [...shellyConfigs];
    newConfigs[index] = {
      ...newConfigs[index],
      [field]: value
    };
    setShellyConfigs(newConfigs);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Chargement...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-6">Profil utilisateur</h1>
      
      <div className="grid grid-cols-1 gap-6">
        <UserProfileCard 
          userEmail={userEmail} 
          loading={loading} 
          setLoading={setLoading} 
        />
        
        <ShellyConfigList
          shellyConfigs={shellyConfigs}
          savingConfig={savingConfig}
          deletingConfig={deletingConfig}
          updateConfigField={updateConfigField}
          handleUpdateConfig={handleUpdateConfig}
          handleDeleteConfig={handleDeleteConfig}
          handleAddNewConfig={handleAddNewConfig}
        />
        
        <RoofSections 
          shellyConfigs={shellyConfigs} 
          selectedConfigId={shellyConfigs.length > 0 ? shellyConfigs[0].id : undefined}
        />
      </div>
    </div>
  );
}
