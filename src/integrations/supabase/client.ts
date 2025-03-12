
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://lmjgnolsowhtncjtrrvi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxtamdub2xzb3dodG5janRycnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0MTU1MzQsImV4cCI6MjA1NTk5MTUzNH0.f6e39ONwt9qCB9FPQA-ohds-rTSuND3Y8lgdj26L3uk";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY,
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
        maxReconnectAttempts: 10,
        timeout: 30000
      }
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  }
);

// Enable realtime subscriptions for the energy_data table
const setupRealtimeSubscriptions = async () => {
  try {
    // Enable realtime for the energy_data table
    await supabase.channel('energy-data-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'energy_data'
      }, (payload) => {
        console.log('Realtime energy_data update:', payload);
      })
      .subscribe();
    
    console.log('Realtime subscriptions enabled');
  } catch (error) {
    console.error('Error setting up realtime subscriptions:', error);
  }
};

// Call the function to initialize realtime
setupRealtimeSubscriptions();
