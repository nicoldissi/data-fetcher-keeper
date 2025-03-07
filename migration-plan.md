# Migration Plan: Fetching Shelly Data via Supabase

This document outlines the plan to modify the frontend to fetch Shelly device data through Supabase instead of directly from the devices.

## Current Architecture

1. The frontend currently uses two approaches to fetch Shelly data:
   - Direct fetching via `useShellyData` hook in `src/hooks/useShellyData.tsx`
   - Server-side fetching via `useServerShellyData` hook in `src/hooks/useServerShellyData.tsx` (not widely used)

2. The direct fetching approach:
   - Uses `fetchShellyData` and `storeEnergyData` functions from `src/lib/api.ts`
   - `fetchShellyData` currently fetches data from Supabase's `energy_data` table
   - However, this data is originally fetched directly from Shelly devices and then stored in Supabase

3. The server-side approach:
   - Uses Supabase Edge Function `fetch-shelly-data`
   - This function fetches data directly from Shelly devices and returns it to the frontend
   - It also stores the data in the `energy_data` table

## Target Architecture

1. All Shelly data fetching should go through Supabase
2. The frontend should never directly communicate with Shelly devices
3. Supabase Edge Functions should handle all communication with Shelly devices
4. The frontend should only read data from Supabase tables or call Supabase Edge Functions

## Implementation Plan

### 1. Modify `useServerShellyData` hook

- Ensure it's robust and handles all edge cases
- Add additional functionality if needed to match `useShellyData`

### 2. Replace `useShellyData` with `useServerShellyData`

- Update all components that use `useShellyData` to use `useServerShellyData` instead
- Main components to update:
  - `ShellyDashboard.tsx`
  - `index.tsx` (main page)

### 3. Update API functions

- Modify `fetchShellyData` to always use Supabase Edge Functions
- Update `storeEnergyData` to be used only by the Edge Function

### 4. Test and Verify

- Ensure all components work correctly with the new data fetching approach
- Verify that no direct communication with Shelly devices occurs

## Detailed Changes

### 1. Update `ShellyDashboard.tsx`

```tsx
// Replace
import { useShellyData } from '@/hooks/useShellyData';
// With
import { useServerShellyData } from '@/hooks/useServerShellyData';

// Replace
const { currentData, isLoading, error, lastStored, history, stats } = useShellyData(activeConfigId);
// With
const [config, setConfig] = useState(null);
useEffect(() => {
  const loadConfig = async () => {
    if (activeConfigId) {
      const config = await getShellyConfig(activeConfigId);
      setConfig(config);
    }
  };
  loadConfig();
}, [activeConfigId]);
const { data: serverData, isLoading, error } = useServerShellyData(config);
const currentData = serverData?.data?.[0] || null;
```

### 2. Update `index.tsx`

```tsx
// Replace
import { useShellyData } from '@/hooks/useShellyData';
// With
import { useServerShellyData } from '@/hooks/useServerShellyData';

// Replace
const { currentData, isLoading } = useShellyData(configId);
// With
const [config, setConfig] = useState(null);
useEffect(() => {
  const loadConfig = async () => {
    if (configId) {
      const config = await getShellyConfig(configId);
      setConfig(config);
    }
  };
  loadConfig();
}, [configId]);
const { data: serverData, isLoading, error } = useServerShellyData(config);
const currentData = serverData?.data?.[0] || null;
```

### 3. Enhance `useServerShellyData.tsx`

```tsx
// Add history tracking similar to useShellyData
const [history, setHistory] = useState<ShellyEMData[]>([]);

// Update the useQuery to store history
useEffect(() => {
  if (serverData?.data) {
    setHistory(prev => {
      const newHistory = [...prev, serverData.data[0]];
      return newHistory.slice(-100); // Keep last 100 readings
    });
  }
}, [serverData?.data]);

// Return history in the hook
return {
  data: serverData,
  isLoading,
  error: serverData?.error || null,
  history
};
```

## Benefits

1. **Security**: Shelly API keys are not exposed to the frontend
2. **Centralization**: All data fetching logic is in one place
3. **Efficiency**: Reduced duplicate code
4. **Scalability**: Easier to add new features or modify existing ones
5. **Maintainability**: Clearer separation of concerns

## Next Steps

After implementing these changes, consider:

1. Adding more robust error handling
2. Implementing caching strategies
3. Adding real-time updates using Supabase's realtime features
4. Enhancing the Edge Function to handle more complex queries