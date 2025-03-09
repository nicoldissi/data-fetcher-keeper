import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
  try {
    // Check required environment variables
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!serviceRoleKey || !supabaseUrl || !anonKey) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    
    const isServiceRole = authHeader === `Bearer ${serviceRoleKey}`;

    // Create a Supabase client
    const clientKey = isServiceRole ? serviceRoleKey : anonKey;
    const supabaseClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        global: {
          headers: { Authorization: `Bearer ${serviceRoleKey}` }
        }
      }
    );

    // Parse the request data
    const requestBody = await req.json();
    
    const { configId } = requestBody || {};

    console.log('Request received:', { configId, isServiceRole, authHeader: authHeader ? 'present' : 'missing' });

    // Get the Shelly configuration(s)
    let query = supabaseClient
      .from('shelly_configs')
      .select('*');

    // No need to check user_id since devices can be shared
    console.log('Query to be executed:', query);

    if (configId) {
      query = query.eq('id', configId);
      const { data: configData, error: configError } = await query.limit(1).single();

      if (configError) {
        console.error('Error getting config:', { configId, error: configError.message });
        return new Response(
          JSON.stringify({ error: 'Configuration not found', details: configError.message }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!configData) {
        console.error('Configuration not found:', { configId });
        return new Response(
          JSON.stringify({ error: 'Configuration not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Process the single configuration
      return await processShellyConfig(configData, supabaseClient);
    } else {
      const { data: configsData, error: configsError } = await query;

      if (configsError) {
        console.error('Error getting all configs:', { error: configsError.message });
        return new Response(
          JSON.stringify({ error: 'Error fetching configurations', details: configsError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('configsData:', configsData);
      if (!configsData || configsData.length === 0) {
        console.warn('No configurations found:', { isServiceRole });
        return new Response(
          JSON.stringify({ message: 'No Shelly configurations found' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Processing multiple configs:', { count: configsData.length });

      // Process all configurations and collect results
      const results = [];
      const errors = [];

      for (const configData of configsData) {
        try {
          const result = await processShellyConfigWithoutResponse(configData, supabaseClient);
          results.push({
            configId: configData.id,
            name: configData.name,
            success: true,
            data: result
          });
        } catch (error) {
          console.error(`Error processing config ${configData.id}:`, error);
          errors.push({
            configId: configData.id,
            name: configData.name,
            error: error.message
          });
        }
      }

      return new Response(
        JSON.stringify({
          processed: results.length,
          successful: results.length - errors.length,
          failed: errors.length,
          results,
          errors
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Unexpected error in fetch-shelly-data:', error);
    return new Response(
      JSON.stringify({ error: 'Unexpected server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to process a single Shelly configuration and return a Response
async function processShellyConfig(configData, supabaseClient) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  try {
    console.log(`Processing config ${configData.id}:`, { name: configData.name, deviceId: configData.deviceid });
    const result = await processShellyConfigWithoutResponse(configData, supabaseClient);

    console.log(`Successfully processed config ${configData.id}`);
    return new Response(
      JSON.stringify({
        data: result.shellyData,
        stored: result.stored
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(`Error processing config ${configData.id}:`, error);
    return new Response(
      JSON.stringify({ error: 'Error processing Shelly config', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Helper function to process a single Shelly configuration without creating a Response
async function processShellyConfigWithoutResponse(configData, supabaseClient) {
  // Construct the Shelly Cloud URL
  const shellyCloudUrl = `${configData.serverurl}/device/status?id=${configData.deviceid}&auth_key=${configData.apikey}`;
  console.log(`Fetching data from Shelly Cloud for device ${configData.deviceid}`);

  try {
    // Fetch data from Shelly Cloud API
    const response = await fetch(shellyCloudUrl);
    if (!response.ok) {
      const errorMsg = `HTTP error! status: ${response.status}`;
      console.error(`Shelly API error for device ${configData.deviceid}:`, errorMsg);
      throw new Error(errorMsg);
    }
    const jsonResponse = await response.json();

    if (!jsonResponse.isok || !jsonResponse.data || !jsonResponse.data.device_status) {
      throw new Error('Invalid Shelly response format');
    }

    const deviceStatus = jsonResponse.data.device_status;
    const deviceType = configData.device_type || 'ShellyEM';

    // Process the data based on device type
    let gridMeter, productionMeter;

    if (deviceType === 'ShellyProEM') {
      // Shelly Pro EM has a different data structure
      if (!deviceStatus['em1:0']) {
        console.warn('No em1:0 data found in Shelly Pro EM device status, using default values');
        gridMeter = {
          power: 0,
          reactive: 0,
          voltage: 0,
          total: 0,
          pf: 0,
          is_valid: true,
          total_returned: 0
        };
      } else {
        gridMeter = {
          power: deviceStatus['em1:0'].act_power || 0,
          reactive: deviceStatus['em1:0'].aprt_power || 0, // Récupération de la puissance réactive pour Pro EM
          voltage: deviceStatus['em1:0'].voltage || 0,
          total: deviceStatus['em1data:0']?.total_act_energy || 0,
          pf: deviceStatus['em1:0'].pf || 0,
          is_valid: true, // Pro EM doesn't have this field, assume true if we get data
          total_returned: deviceStatus['em1data:0']?.total_act_ret_energy || 0
        };
      }

      if (!deviceStatus['em1:1']) {
        productionMeter = null;
      } else {
        productionMeter = {
          power: deviceStatus['em1:1'].act_power || 0,
          reactive: deviceStatus['em1:1'].aprt_power || 0, // Ajout de la puissance réactive pour le PV
          total: deviceStatus['em1data:1']?.total_act_energy || 0,
          pf: deviceStatus['em1:1'].pf || 0 // Ajout du facteur de puissance pour le PV
        };
      }
    } else {
      // Standard Shelly EM processing
      if (!deviceStatus.emeters || !Array.isArray(deviceStatus.emeters) || deviceStatus.emeters.length === 0) {
        console.warn('No emeters data found in device status, using default values');
        gridMeter = {
          power: 0,
          reactive: 0,
          voltage: 0,
          total: 0,
          pf: 0,
          is_valid: false,
          total_returned: 0
        };
        productionMeter = null;
      } else {
        gridMeter = deviceStatus.emeters[0];
        productionMeter = deviceStatus.emeters.length > 1 ? deviceStatus.emeters[1] : null;
      }
    }

    // Parse the timestamp
    const deviceDate = new Date(deviceStatus._updated + 'Z');
    const timestamp = deviceDate.getTime();

    // Format the data with renamed fields
    const shellyData = {
      timestamp,
      power: gridMeter.power || 0,
      reactive: gridMeter.reactive || 0,
      pv_power: productionMeter ? (productionMeter.power || 0) : 0,
      pv_reactive: productionMeter ? (productionMeter.reactive || 0) : 0,
      total_energy: gridMeter.total || 0,
      pv_energy: productionMeter ? (productionMeter.total || 0) : 0,
      grid_returned: gridMeter.total_returned || 0,
      voltage: gridMeter.voltage || 0,
      current: 0,
      pf: gridMeter.pf || 0,
      pv_pf: productionMeter ? (productionMeter.pf || 0) : 0,
      temperature: deviceStatus.temperature?.tC || 0,
      is_valid: gridMeter.is_valid || false,
      channel: 0
    };

    // Store the data in the database with the new field names
    const { error: storeError } = await supabaseClient
      .from('energy_data')
      .insert([{
        timestamp: new Date(timestamp).toISOString(),
        consumption: shellyData.power,
        production: shellyData.pv_power,
        grid_total: shellyData.total_energy,
        grid_total_returned: shellyData.grid_returned,
        production_total: shellyData.pv_energy,
        shelly_config_id: configData.id,
        voltage: shellyData.voltage,
        frequency: deviceType === 'ShellyProEM' ? (deviceStatus['em1:0']?.freq || null) : null,
        pf: shellyData.pf || 0,
        reactive: shellyData.reactive || 0,
        pv_pf: shellyData.pv_pf || 0,
        pv_reactive: shellyData.pv_reactive || 0
      }]);

    if (storeError) {
      console.error('Error storing data:', storeError);
    }

    return {
      shellyData,
      stored: !storeError
    };
  } catch (error) {
    console.error(`Error in processShellyConfigWithoutResponse for device ${configData.deviceid}:`, error);
    throw error; // Re-throw the error to be caught in the outer function
  }
}
