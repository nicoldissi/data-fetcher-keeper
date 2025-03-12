
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Format date as YYYY-MM-DD HH:MM:SS
function formatDateForPVlibs(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get all Shelly configurations
    const { data: shellyConfigs, error: configError } = await supabase
      .from('shelly_configs')
      .select(`
        id,
        latitude,
        longitude,
        pv_panels (
          id,
          power_wp,
          inclination,
          azimuth
        )
      `);

    if (configError) throw configError;
    
    console.log(`Found ${shellyConfigs.length} Shelly configurations`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Process each Shelly configuration
    for (const config of shellyConfigs) {
      console.log(`Processing config ${config.id}:`, JSON.stringify({
        hasLocation: Boolean(config.latitude && config.longitude),
        location: { lat: config.latitude, long: config.longitude },
        panelCount: config.pv_panels?.length || 0,
        panels: config.pv_panels
      }, null, 2));
      
      if (!config.latitude || !config.longitude) {
        console.log(`Skipping config ${config.id}: Missing location data (latitude: ${config.latitude}, longitude: ${config.longitude})`);
        continue;
      }
      
      if (!config.pv_panels || config.pv_panels.length === 0) {
        console.log(`Skipping config ${config.id}: No panels found in the database`);
        continue;
      }
      
      // Log each panel for debugging
      config.pv_panels.forEach((panel, index) => {
        console.log(`Panel ${index+1} for config ${config.id}:`, 
          `id=${panel.id}`,
          `power=${panel.power_wp}W`,
          `inclination=${panel.inclination}°`, 
          `azimuth=${panel.azimuth}°`);
      });

      // Prepare roof sections data from PV panels
      const roofSections = config.pv_panels.map(panel => ({
        surface_tilt: panel.inclination,
        surface_azimuth: panel.azimuth,
        power_kw: panel.power_wp / 1000 // Convert Wp to kWp
      }));

      // Format dates for PVlibs API as "YYYY-MM-DD HH:MM:SS"
      const startDate = formatDateForPVlibs(today);
      const endDate = formatDateForPVlibs(tomorrow);

      const requestBody = {
        location: {
          latitude: config.latitude,
          longitude: config.longitude,
          altitude: 200,
          tz: "UTC" // Changed from "Europe/Paris" to "UTC"
        },
        datetime: {
          start: startDate,
          end: endDate,
          freq: "20min" // Changed from "1h" to "20min"
        },
        roof_sections: roofSections,
        module_parameters: {
          pdc0: 450,
          gamma_pdc: -0.002
        },
        inverter_parameters: {
          pdc0: 6000,
          eta_inv_nom: 0.98
        }
      };

      // Call PVlibs API
      console.log(`Calling PVlibs API for config ${config.id} with request:`, JSON.stringify(requestBody, null, 2));

      const response = await fetch('https://pvlibs.onrender.com/pv-system-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const pvlibsData = await response.json();
      console.log(`Received response from PVlibs API for config ${config.id}:`, JSON.stringify(pvlibsData, null, 2));

      if (!pvlibsData.times || !pvlibsData.ac_power || pvlibsData.times.length === 0) {
        console.error(`No valid data returned from PVlibs API for config ${config.id}. Full response:`, JSON.stringify(pvlibsData, null, 2));
        continue;
      }

      // Now the times from PVlibs are already in UTC, so we can store them directly
      const clearSkyData = pvlibsData.times.map((time: string, index: number) => ({
        shelly_config_id: config.id,
        timestamp: time,
        power: pvlibsData.ac_power[index],
        created_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('clear_sky_production')
        .upsert(clearSkyData, { 
          onConflict: 'shelly_config_id,timestamp',
          ignoreDuplicates: false 
        });

      if (insertError) {
        console.error(`Error storing predictions for config ${config.id}:`, insertError);
      } else {
        console.log(`Successfully stored ${clearSkyData.length} predictions for config ${config.id}`);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Processed ${shellyConfigs.length} Shelly configurations` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in fetch-clear-sky-production:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

