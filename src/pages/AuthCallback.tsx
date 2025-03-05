
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Check if we have a hash in the URL (common with OAuth redirects)
      if (location.hash && location.hash.includes('access_token')) {
        // Extract access token from URL
        const hashParams = new URLSearchParams(location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken && refreshToken) {
          try {
            // Set the session manually with the tokens from the URL
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            
            if (error) throw error;
            
            console.log('Session set successfully:', data);
            
            toast({
              title: "Connexion réussie",
              description: "Vous êtes maintenant connecté.",
            });
            
            // Redirect to homepage
            navigate('/');
            return;
          } catch (err) {
            console.error('Error setting session:', err);
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
          }
        }
      }
      
      // Fall back to the regular session check if hash parameters aren't present
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        setError(error.message);
        toast({
          variant: "destructive",
          title: "Erreur d'authentification",
          description: error.message,
        });
        navigate('/auth');
        return;
      }
      
      if (data?.session) {
        toast({
          title: "Connexion réussie",
          description: "Vous êtes maintenant connecté.",
        });
        navigate('/');
      } else {
        navigate('/auth');
      }
    };

    handleAuthCallback();
  }, [navigate, location.hash]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erreur d'authentification</h1>
          <p className="mb-8">{error}</p>
          <button
            onClick={() => navigate('/auth')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md"
          >
            Retour à la page de connexion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="ml-4 text-xl">Authentification en cours...</p>
    </div>
  );
}
