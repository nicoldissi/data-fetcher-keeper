
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShellyConfigForm } from '@/components/ShellyConfigForm';
import { isShellyConfigValid } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [hasValidConfig, setHasValidConfig] = useState<boolean>(false);
  const [checkingConfig, setCheckingConfig] = useState<boolean>(true);
  const navigate = useNavigate();

  // Check if user is already authenticated
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Session check:", session);
        if (session) {
          setIsAuthenticated(true);
          // Check if they have a valid Shelly config
          checkShellyConfig();
        } else {
          setCheckingConfig(false);
        }
      } catch (error) {
        console.error("Error checking session:", error);
        setCheckingConfig(false);
      }
    };

    checkSession();
  }, []);

  // Check if the user has a valid Shelly configuration
  const checkShellyConfig = async () => {
    setCheckingConfig(true);
    try {
      console.log("Checking if user has a valid Shelly config");
      const isValid = await isShellyConfigValid();
      console.log("Shelly config valid:", isValid);
      
      if (isValid) {
        setHasValidConfig(true);
        // Redirect to dashboard if they have a valid config
        navigate('/');
      } else {
        setHasValidConfig(false);
      }
    } catch (error) {
      console.error("Error checking Shelly config:", error);
      setHasValidConfig(false);
    } finally {
      setCheckingConfig(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      console.log("User signed in:", email);
      setIsAuthenticated(true);
      
      // After successful login, check if they have a valid config
      await checkShellyConfig();
    } catch (error: any) {
      console.error("Error signing in:", error.message);
      toast({
        variant: "destructive",
        title: "Erreur de connexion",
        description: error.message || "Vérifiez vos identifiants et réessayez."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Inscription réussie",
        description: "Veuillez vérifier votre email pour confirmer votre compte."
      });
    } catch (error: any) {
      console.error("Error signing up:", error.message);
      toast({
        variant: "destructive",
        title: "Erreur d'inscription",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfigSaved = () => {
    console.log("Shelly configuration saved");
    navigate('/');
  };

  // Show loading state while checking
  if (checkingConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Chargement...</p>
      </div>
    );
  }

  // If authenticated but no valid config, show the config form
  if (isAuthenticated && !hasValidConfig) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-6">Configuration de l'appareil</h1>
        <p className="mb-4">Vous êtes connecté mais n'avez pas encore configuré d'appareil Shelly.</p>
        <ShellyConfigForm onConfigured={handleConfigSaved} redirectToDashboard={true} />
      </div>
    );
  }

  // If not authenticated, show login form
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connexion</CardTitle>
          <CardDescription>
            Connectez-vous à votre compte pour accéder au moniteur d'énergie
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? "Connexion en cours..." : "Se connecter"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col">
          <div className="text-sm text-gray-500 mb-4">
            Pas encore de compte ?
          </div>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleSignUp}
            disabled={loading}
          >
            Créer un compte
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Auth;
