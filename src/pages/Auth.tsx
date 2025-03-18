
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

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth/callback'
        }
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error("Error signing in with Google:", error.message);
      toast({
        variant: "destructive",
        title: "Erreur de connexion Google",
        description: error.message || "Une erreur s'est produite lors de la connexion avec Google."
      });
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

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Ou</span>
              </div>
            </div>

            <Button 
              type="button" 
              variant="outline" 
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" className="mr-2">
                <path fill="currentColor" d="M15.545 6.558a9.42 9.42 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.689 7.689 0 0 1 5.352 2.082l-2.284 2.284A4.347 4.347 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.792 4.792 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.702 3.702 0 0 0 1.599-2.431H8v-3.08h7.545z"/>
              </svg>
              Se connecter avec Google
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
