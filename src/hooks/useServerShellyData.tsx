
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ShellyEMData, ShellyConfig } from '@/lib/types';
import { toast } from '@/components/ui/use-toast';

interface FetchShellyDataResponse {
  data: ShellyEMData[] | null;
  error: string | null;
}

export const useServerShellyData = (config: ShellyConfig | null) => {
  const fetchShellyData = async (): Promise<FetchShellyDataResponse> => {
    if (!config) {
      return { data: null, error: 'No Shelly device configured' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('fetch-shelly-data', {
        body: {
          deviceId: config.deviceid,
          apiKey: config.apikey,
          serverUrl: config.serverurl
        }
      });

      if (error) {
        console.error('Error fetching Shelly data:', error);
        return { data: null, error: error.message };
      }

      return { data: data as ShellyEMData[], error: null };
    } catch (error: any) {
      console.error('Failed to fetch Shelly data:', error);
      return { data: null, error: error.message || 'Failed to fetch data' };
    }
  };

  return useQuery({
    queryKey: ['serverShellyData', config?.deviceid],
    queryFn: fetchShellyData,
    enabled: !!config?.deviceid && !!config?.apikey && !!config?.serverurl,
    refetchInterval: 60000, // Refresh every minute
    retry: 3,
    meta: {
      onError: (error: any) => {
        toast({
          variant: "destructive",
          title: "Error fetching data",
          description: error.message || "Failed to fetch Shelly data",
        });
      }
    }
  });
};
