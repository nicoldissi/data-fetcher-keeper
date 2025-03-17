
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShellyConfig } from '@/lib/types';
import { updateShellyConfig, getShellyConfig, isShellyConfigValid } from '@/lib/api/index';
import { toast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import { useNavigate } from 'react-router-dom';

interface ShellyConfigFormProps {
  onConfigured: () => void;
  redirectToDashboard?: boolean;
  className?: string;
}

export function ShellyConfigForm({ onConfigured, redirectToDashboard = false, className = "" }: ShellyConfigFormProps) {
  const [deviceId, setDeviceId] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('https://shelly-11-eu.shelly.cloud');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [deviceType, setDeviceType] = useState<'ShellyEM' | 'ShellyProEM'>('ShellyEM');
  const [inverseMeters, setInverseMeters] = useState<boolean>(false);
  const [deviceName, setDeviceName] = useState<string>('My Shelly Device');
  const [loadError, setLoadError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Try to load configuration from localStorage or database
    const loadConfig = async () => {
      try {
        console.log("Loading existing Shelly config...");
        const config = await getShellyConfig();
        console.log("Loaded config:", config);
        
        if (config && config.deviceId) {
          setDeviceId(config.deviceId || '');
          setApiKey(config.apiKey || '');
          setServerUrl(config.serverUrl || 'https://shelly-11-eu.shelly.cloud');
          setDeviceType(config.deviceType || 'ShellyEM');
          setInverseMeters(!!config.inverse_meters);
          setDeviceName(config.name || 'My Shelly Device');
          console.log("Config loaded successfully with inverse_meters:", !!config.inverse_meters);
        } else {
          console.log("No existing config found, using defaults");
        }
      } catch (error) {
        console.error("Error loading Shelly config:", error);
        setLoadError("Failed to load existing configuration. You can create a new one.");
      }
    };
    
    loadConfig();
  }, []);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
  
    if (!deviceId || !apiKey || !serverUrl) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please provide device ID, API key, and server URL"
      });
      setIsLoading(false);
      return;
    }
  
    const config: ShellyConfig = {
      deviceId: deviceId.trim(),
      apiKey: apiKey.trim(),
      serverUrl: serverUrl.trim(),
      deviceType: deviceType,
      name: deviceName.trim(),
      inverse_meters: inverseMeters
    };
  
    console.log("Saving Shelly config with values:", JSON.stringify(config, null, 2));
    
    // Save the configuration and hide the form
    updateShellyConfig(config)
      .then((savedConfig) => {
        setIsLoading(false);
        console.log("Configuration saved successfully:", savedConfig);
        
        toast({
          title: "Configuration saved",
          description: "Your Shelly device is now configured"
        });
        
        if (redirectToDashboard) {
          navigate('/');
        } else {
          onConfigured();
        }
      })
      .catch(error => {
        console.error("Error saving configuration:", error);
        setIsLoading(false);
        toast({
          variant: "destructive",
          title: "Configuration failed",
          description: "There was an error saving your configuration. Please try again."
        });
      });
  };
  
  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardHeader>
        <CardTitle>Configure Shelly Device</CardTitle>
        <CardDescription>
          Enter your Shelly device ID and API key to connect to your device
          {loadError && (
            <p className="mt-2 text-amber-500 dark:text-amber-400">{loadError}</p>
          )}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deviceName">Device Name</Label>
            <Input
              id="deviceName"
              placeholder="My Shelly Device"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deviceId">Device ID</Label>
            <Input
              id="deviceId"
              placeholder="shellyem3-XXXXXXXXXXXX"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="MWRiNzA1dWlk1234567890EXAMPLE"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="serverUrl">Server URL</Label>
            <Input
              id="serverUrl"
              placeholder="https://shelly-12-eu.shelly.cloud"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deviceType">Device Type</Label>
            <select
              id="deviceType"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value as 'ShellyEM' | 'ShellyProEM')}
              required
            >
              <option value="ShellyEM">Shelly EM</option>
              <option value="ShellyProEM">Shelly Pro EM</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <Switch 
              id="inverse-meters" 
              checked={inverseMeters}
              onCheckedChange={setInverseMeters}
            />
            <Label htmlFor="inverse-meters">
              Meters inverted (PV production on emeter 0)
            </Label>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Configuration"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
