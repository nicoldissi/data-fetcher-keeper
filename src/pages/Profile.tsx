
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { getShellyConfig, updateShellyConfig } from "@/lib/api";

export default function Profile() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  
  // Shelly configuration states
  const [deviceId, setDeviceId] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [serverUrl, setServerUrl] = useState<string>("");
  const [savingConfig, setSavingConfig] = useState(false);

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

    // Load Shelly configuration
    const config = getShellyConfig();
    setDeviceId(config.deviceId);
    setApiKey(config.apiKey);
    setServerUrl(config.serverUrl);

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

  const handleSaveShellyConfig = () => {
    setSavingConfig(true);
    try {
      updateShellyConfig({
        deviceId: deviceId.trim(),
        apiKey: apiKey.trim(),
        serverUrl: serverUrl.trim()
      });
      
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
      setSavingConfig(false);
    }
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        
        <Card>
          <CardHeader>
            <CardTitle>Configuration Shelly</CardTitle>
            <CardDescription>
              Paramètres de connexion à votre appareil Shelly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deviceId">ID de l'appareil</Label>
              <Input
                id="deviceId"
                placeholder="shellyem3-XXXXXXXXXXXX"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">Clé API</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="MWRiNzA1dWlk1234567890EXAMPLE"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serverUrl">URL du serveur</Label>
              <Input
                id="serverUrl"
                placeholder="https://shelly-12-eu.shelly.cloud"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleSaveShellyConfig} 
              disabled={savingConfig}
            >
              {savingConfig ? "Enregistrement..." : "Enregistrer la configuration"}
            </Button>
          </CardFooter>
        </Card>
        
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
