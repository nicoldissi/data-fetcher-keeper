import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { getShellyConfigs, updateShellyConfig, deleteShellyConfig } from "@/lib/api";
import { ShellyConfig } from "@/lib/types";
import { PlusCircle, Trash2, Save } from "lucide-react";

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

  const handleChangePassword = async () => {
    if (!userEmail) return;

    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Email envoyé",
        description: "Vérifiez votre email pour réinitialiser votre mot de passe",
      });
    } catch (error) {
      console.error("Error sending password reset:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de l'envoi de l'email",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async (index: number) => {
    const config = shellyConfigs[index];
    setSavingConfig(config.id || "new");
    
    try {
      const updatedConfig = await updateShellyConfig({
        ...config,
        deviceId: config.deviceId.trim(),
        apiKey: config.apiKey.trim(),
        serverUrl: config.serverUrl.trim(),
        name: config.name?.trim() || `Appareil ${index + 1}`
      });
      
      if (updatedConfig) {
        // Update the configs list with the new data
        const newConfigs = [...shellyConfigs];
        newConfigs[index] = updatedConfig;
        setShellyConfigs(newConfigs);
        
        // If it was a new config, reset the new config flag
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
      name: `Appareil ${shellyConfigs.length + 1}`
    };
    
    setShellyConfigs([...shellyConfigs, newConfigItem]);
    setNewConfig(true);
  };

  const updateConfigField = (index: number, field: keyof ShellyConfig, value: string) => {
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
        <Card>
          <CardHeader>
            <CardTitle>Informations de compte</CardTitle>
            <CardDescription>
              Consultez et modifiez les informations de votre compte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={userEmail || ""} readOnly />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleChangePassword} disabled={loading}>
              {loading ? "Traitement..." : "Changer le mot de passe"}
            </Button>
          </CardFooter>
        </Card>
        
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Appareils Shelly</h2>
            <Button onClick={handleAddNewConfig} variant="outline" className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" /> Ajouter un appareil
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {shellyConfigs.map((config, index) => (
              <Card key={config.id || `new-${index}`}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>
                      <div className="flex items-center space-x-2">
                        <Input 
                          className="font-semibold text-lg h-8 w-full"
                          value={config.name || `Appareil ${index + 1}`}
                          onChange={(e) => updateConfigField(index, 'name', e.target.value)}
                          placeholder="Nom de l'appareil"
                        />
                      </div>
                    </CardTitle>
                  </div>
                  <CardDescription>
                    Paramètres de connexion à votre appareil Shelly
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`deviceId-${index}`}>ID de l'appareil</Label>
                    <Input
                      id={`deviceId-${index}`}
                      placeholder="shellyem3-XXXXXXXXXXXX"
                      value={config.deviceId}
                      onChange={(e) => updateConfigField(index, 'deviceId', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`apiKey-${index}`}>Clé API</Label>
                    <Input
                      id={`apiKey-${index}`}
                      type="password"
                      placeholder="MWRiNzA1dWlk1234567890EXAMPLE"
                      value={config.apiKey}
                      onChange={(e) => updateConfigField(index, 'apiKey', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`serverUrl-${index}`}>URL du serveur</Label>
                    <Input
                      id={`serverUrl-${index}`}
                      placeholder="https://shelly-12-eu.shelly.cloud"
                      value={config.serverUrl}
                      onChange={(e) => updateConfigField(index, 'serverUrl', e.target.value)}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button 
                    onClick={() => handleUpdateConfig(index)} 
                    disabled={savingConfig === (config.id || "new")}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {savingConfig === (config.id || "new") ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                  
                  {config.id && (
                    <Button 
                      variant="destructive" 
                      onClick={() => handleDeleteConfig(config.id!, index)}
                      disabled={deletingConfig === config.id}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingConfig === config.id ? "Suppression..." : "Supprimer"}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Préférences</CardTitle>
            <CardDescription>
              Personnalisez vos préférences d'affichage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Fonctionnalités à venir dans une future mise à jour.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
