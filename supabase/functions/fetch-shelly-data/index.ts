
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

    // Create a Supabase client with the service role key
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
    const requestBody = await req.json().catch(() => ({}));
    const { configId } = requestBody || {};

    console.log('Request received:', { configId, method: req.method });

    // Get the Shelly configuration(s)
    let query = supabaseClient
      .from('shelly_configs')
      .select('*');

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
        console.warn('No configurations found');
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

// Calculate reactive power using the formula Q = √(S² - P²)
function calculateReactivePower(apparentPower, activePower) {
  // Safety check to ensure we don't calculate negative values under the square root
  const underRoot = Math.pow(apparentPower, 2) - Math.pow(activePower, 2);
  return underRoot > 0 ? Math.sqrt(underRoot) : 0;
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
    const inverseMeters = !!configData.inverse_meters; // Check if meters are inverted

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
        // Determine which meter is grid and which is production based on inverse_meters
        const gridIndex = inverseMeters ? 1 : 0;
        const pvIndex = inverseMeters ? 0 : 1;

        // For Shelly Pro EM, extract active power and apparent power to calculate reactive power
        const activePower = deviceStatus[`em1:${gridIndex}`]?.act_power || 0;
        const apparentPower = deviceStatus[`em1:${gridIndex}`]?.aprt_power || 0;
        
        // Calculate reactive power using the formula Q = √(S² - P²)
        // where S is apparent power and P is active power
        const reactivePower = calculateReactivePower(apparentPower, activePower);
        
        console.log('Pro EM calculated values:', {
          activePower,
          apparentPower,
          reactivePower,
          inverseMeters
        });
        
        gridMeter = {
          power: activePower,
          reactive: reactivePower, // Use the calculated reactive power
          voltage: deviceStatus[`em1:${gridIndex}`]?.voltage || 0,
          total: deviceStatus[`em1data:${gridIndex}`]?.total_act_energy || 0,
          pf: deviceStatus[`em1:${gridIndex}`]?.pf || 0,
          is_valid: true, // Pro EM doesn't have this field, assume true if we get data
          total_returned: deviceStatus[`em1data:${gridIndex}`]?.total_act_ret_energy || 0
        };

        if (!deviceStatus[`em1:${pvIndex}`]) {
          productionMeter = null;
        } else {
          // Similarly for PV (production meter)
          const pvActivePower = deviceStatus[`em1:${pvIndex}`]?.act_power || 0;
          const pvApparentPower = deviceStatus[`em1:${pvIndex}`]?.aprt_power || 0;
          const pvReactivePower = calculateReactivePower(pvApparentPower, pvActivePower);
          
          productionMeter = {
            power: pvActivePower,
            reactive: pvReactivePower, // Use the calculated reactive power
            total: deviceStatus[`em1data:${pvIndex}`]?.total_act_energy || 0,
            pf: deviceStatus[`em1:${pvIndex}`]?.pf || 0 // PV power factor
          };
        }
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
        // Determine which emeter is grid and which is production based on inverse_meters setting
        const gridIndex = inverseMeters ? 1 : 0;
        const pvIndex = inverseMeters ? 0 : 1;
        
        // Log the meter assignment for debugging
        console.log('Meter assignment:', {
          inverseMeters,
          gridIndex,
          pvIndex,
          totalMeters: deviceStatus.emeters.length
        });
        
        // Assign meters based on the configuration
        gridMeter = deviceStatus.emeters.length > gridIndex ? deviceStatus.emeters[gridIndex] : {
          power: 0,
          reactive: 0,
          voltage: 0,
          total: 0,
          pf: 0,
          is_valid: false,
          total_returned: 0
        };
        
        productionMeter = deviceStatus.emeters.length > pvIndex ? deviceStatus.emeters[pvIndex] : null;
        
        // Log the extracted meter data for debugging
        console.log('Extracted meter data:', {
          gridMeter,
          productionMeter
        });
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
      current: 0, // Not available directly from Shelly API
      pf: gridMeter.pf || 0,
      pv_pf: productionMeter ? (productionMeter.pf || 0) : 0,
      temperature: deviceStatus.temperature?.tC || 0,
      is_valid: gridMeter.is_valid || false,
      channel: 0,
      frequency: deviceType === 'ShellyProEM' ? (deviceStatus[inverseMeters ? 'em1:1' : 'em1:0']?.freq || 0) : 0
    };

    console.log(`Prepared Shelly data for insertion:`, JSON.stringify(shellyData, null, 2));

    // Store the data in the database with the new field names
    const insertData = {
      timestamp: new Date(timestamp).toISOString(),
      consumption: shellyData.power,
      production: shellyData.pv_power,
      grid_total: shellyData.total_energy,
      grid_total_returned: shellyData.grid_returned,
      production_total: shellyData.pv_energy,
      shelly_config_id: configData.id,
      voltage: shellyData.voltage,
      frequency: shellyData.frequency,
      grid_pf: shellyData.pf || 0,
      grid_reactive: shellyData.reactive || 0,
      pv_pf: shellyData.pv_pf || 0,
      pv_reactive: shellyData.pv_reactive || 0
    };

    console.log(`Attempting to insert data into Supabase:`, JSON.stringify(insertData, null, 2));

    // Test d'accès à la table avant insertion
    try {
      console.log('Testing table access before insertion...');
      const { data: testData, error: testError } = await supabaseClient
        .from('energy_data')
        .select('id')
        .limit(1);
        
      if (testError) {
        console.error('Table access test failed:', testError);
      } else {
        console.log('Table access test succeeded');
      }
    } catch (e) {
      console.error('Error during table access test:', e);
    }

    const { error: storeError, data: insertedData } = await supabaseClient
      .from('energy_data')
      .insert([insertData])
      .select();

    if (storeError) {
      console.error('Error storing data:', storeError);
      // Try a few debugging steps if insertion fails
      try {
        // Check if the table exists and if we have permissions
        const { data: tableInfo, error: tableError } = await supabaseClient
          .from('energy_data')
          .select('id')
          .limit(1);
          
        if (tableError) {
          console.error('Error checking table access:', tableError);
        } else {
          console.log('Table access verified with data:', tableInfo);
        }
      } catch (e) {
        console.error('Error during debug checks:', e);
      }
      
      throw storeError;
    }

    console.log('Data successfully inserted:', insertedData);

    return {
      shellyData,
      stored: true
    };
  } catch (error) {
    console.error(`Error in processShellyConfigWithoutResponse for device ${configData.deviceid}:`, error);
    throw error; // Re-throw the error to be caught in the outer function
  }
}
