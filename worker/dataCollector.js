// Data Collector Worker for Shelly EM
// This script runs as a background service to collect data from Shelly devices
// and store it in Supabase, even when no users are actively using the web app

const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// Environment variables (will be set in Render.com)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SHELLY_SERVER_URL = process.env.VITE_SHELLY_SERVER_URL;
const SHELLY_DEVICE_ID = process.env.VITE_SHELLY_DEVICE_ID;
const SHELLY_API_KEY = process.env.VITE_SHELLY_API_KEY;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Polling interval in milliseconds (default: 5 minutes)
const POLLING_INTERVAL = process.env.POLLING_INTERVAL || 5 * 60 * 1000;

/**
 * Fetch data from Shelly Cloud API
 */
async function fetchShellyData() {
  const url = `${SHELLY_SERVER_URL}/device/status?id=${SHELLY_DEVICE_ID}&auth_key=${SHELLY_API_KEY}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const jsonResponse = await response.json();
    
    if (!jsonResponse.isok || !jsonResponse.data || !jsonResponse.data.device_status) {
      throw new Error('Invalid Shelly response format');
    }
    
    const deviceStatus = jsonResponse.data.device_status;
    const gridMeter = deviceStatus.emeters[0]; // Grid meter is typically the first emeter
    const productionMeter = deviceStatus.emeters.length > 1 ? deviceStatus.emeters[1] : null; // Production meter (if exists)
    
    // Parse the device's timestamp and convert to UTC
    const deviceDate = new Date(deviceStatus._updated + 'Z');
    const timestamp = deviceDate.getTime();

    return {
      timestamp,
      power: gridMeter.power,
      reactive: gridMeter.reactive,
      production_power: productionMeter ? productionMeter.power : 0,
      total_energy: gridMeter.total,
      production_energy: productionMeter ? productionMeter.total : 0,
      grid_returned: gridMeter.total_returned,
      voltage: gridMeter.voltage,
      current: 0, // Not directly available in the response
      pf: gridMeter.pf,
      temperature: deviceStatus.temperature?.tC || 0,
      is_valid: gridMeter.is_valid,
      channel: 0
    };
  } catch (error) {
    console.error('Error fetching Shelly data:', error.message);
    throw error;
  }
}

/**
 * Store energy data in Supabase
 */
async function storeEnergyData(data) {
  try {
    // Get the last stored record to compare values
    const { data: lastRecord, error: fetchError } = await supabase
      .from('energy_data')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching last record:', fetchError);
      return false;
    }

    // Ensure timestamp is a valid date
    let timestamp;
    if (typeof data.timestamp === 'number') {
      // Convert timestamp to UTC ISO string for Supabase
      const date = new Date(data.timestamp);
      timestamp = date.toISOString();
    } else {
      console.error('Invalid timestamp format:', data.timestamp);
      timestamp = new Date().toISOString(); // Use current time as fallback
    }

    // Compare current values with last stored values and check time threshold
    if (lastRecord && lastRecord.length > 0) {
      const last = lastRecord[0];
      const lastTimestamp = new Date(last.timestamp).getTime() / 1000;
      const currentTimestamp = data.timestamp / 1000; // Convert to seconds for comparison
      const timeDiff = currentTimestamp - lastTimestamp;
      
      // Skip if data is too recent (less than 30 seconds) or if all values are identical
      if (timeDiff < 30 || (
        last.consumption === data.power &&
        last.production === data.production_power &&
        last.grid_total === data.total_energy &&
        last.grid_total_returned === data.grid_returned &&
        last.production_total === data.production_energy
      )) {
        console.log('Skipping storage: data too recent or unchanged from last record');
        return true;
      }
    }

    const { error } = await supabase
      .from('energy_data')
      .insert([
        {
          timestamp,
          consumption: data.power,
          production: data.production_power,
          grid_total: data.total_energy,
          grid_total_returned: data.grid_returned,
          production_total: data.production_energy
        }
      ]);
    
    if (error) {
      console.error('Error storing data in Supabase:', error);
      return false;
    }
    
    console.log('Successfully stored new energy data with timestamp:', timestamp);
    return true;
  } catch (error) {
    console.error('Failed to store data in Supabase:', error);
    return false;
  }
}

/**
 * Main function that runs the data collection process
 */
async function collectData() {
  try {
    console.log('Fetching data from Shelly device...');
    const data = await fetchShellyData();
    console.log('Data fetched successfully:', data);
    
    console.log('Storing data in Supabase...');
    await storeEnergyData(data);
    
    console.log('Data collection cycle completed successfully');
  } catch (error) {
    console.error('Error in data collection cycle:', error.message);
  }
}

// Run the data collection immediately on startup
collectData();

// Then set up the interval for regular collection
setInterval(collectData, POLLING_INTERVAL);

console.log(`Data collector worker started. Polling every ${POLLING_INTERVAL/1000} seconds`);