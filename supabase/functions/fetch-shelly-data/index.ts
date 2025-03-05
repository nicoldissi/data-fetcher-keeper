
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a Supabase client with the user's JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || '',
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Parse the request data
    const { configId } = await req.json();

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication error' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the Shelly configuration
    let query = supabaseClient
      .from('shelly_configs')
      .select('*')
      .eq('user_id', user.id);
    
    if (configId) {
      query = query.eq('id', configId);
    }
    
    const { data: configData, error: configError } = await query.limit(1).single();
    
    if (configError || !configData) {
      return new Response(
        JSON.stringify({ error: 'Configuration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construct the Shelly Cloud URL
    const shellyCloudUrl = `${configData.serverurl}/device/status?id=${configData.deviceid}&auth_key=${configData.apikey}`;

    // Fetch data from Shelly Cloud API
    const response = await fetch(shellyCloudUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const jsonResponse = await response.json();
    
    if (!jsonResponse.isok || !jsonResponse.data || !jsonResponse.data.device_status) {
      throw new Error('Invalid Shelly response format');
    }
    
    const deviceStatus = jsonResponse.data.device_status;
    const deviceType = configData.device_type || 'ShellyEM';
    
    if (!deviceStatus.emeters || !Array.isArray(deviceStatus.emeters) || deviceStatus.emeters.length === 0) {
      throw new Error('No emeters data found in device status');
    }
    
    // Process the data based on device type
    let gridMeter = deviceStatus.emeters[0];
    let productionMeter = deviceStatus.emeters.length > 1 ? deviceStatus.emeters[1] : null;
    
    // Parse the timestamp
    const deviceDate = new Date(deviceStatus._updated + 'Z');
    const timestamp = deviceDate.getTime();

    // Format the data
    const shellyData = {
      timestamp,
      power: gridMeter.power || 0,
      reactive: gridMeter.reactive || 0,
      production_power: productionMeter ? (productionMeter.power || 0) : 0,
      total_energy: gridMeter.total || 0,
      production_energy: productionMeter ? (productionMeter.total || 0) : 0,
      grid_returned: gridMeter.total_returned || 0,
      voltage: gridMeter.voltage || 0,
      current: 0,
      pf: gridMeter.pf || 0,
      temperature: deviceStatus.temperature?.tC || 0,
      is_valid: gridMeter.is_valid || false,
      channel: 0
    };

    // Store the data in the database
    const { error: storeError } = await supabaseClient
      .from('energy_data')
      .insert([{
        timestamp: new Date(timestamp).toISOString(),
        consumption: shellyData.power,
        production: shellyData.production_power,
        grid_total: shellyData.total_energy,
        grid_total_returned: shellyData.grid_returned,
        production_total: shellyData.production_energy,
        shelly_config_id: configData.id
      }]);
    
    if (storeError) {
      console.error('Error storing data:', storeError);
    }

    return new Response(
      JSON.stringify({ 
        data: shellyData,
        stored: !storeError
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-shelly-data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
