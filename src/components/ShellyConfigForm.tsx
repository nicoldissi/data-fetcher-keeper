import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShellyConfig } from '@/lib/types';
import { updateShellyConfig, getShellyConfig, isShellyConfigValid } from '@/lib/api/index';
import { toast } from '@/components/ui/use-toast';

interface ShellyConfigFormProps {
  onConfigured: () => void;
}

export function ShellyConfigForm({ onConfigured }: ShellyConfigFormProps) {
  const [deviceId, setDeviceId] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [deviceType, setDeviceType] = useState<'ShellyEM' | 'ShellyProEM'>('ShellyEM');
  
  useEffect(() => {
    // Try to load configuration from localStorage or database
    const loadConfig = async () => {
      const config = await getShellyConfig();
      if (config) {
        setDeviceId(config.deviceId || '');
        setApiKey(config.apiKey || '');
        setServerUrl(config.serverUrl || '');
        setDeviceType(config.deviceType || 'ShellyEM');
      }
    };
    
    loadConfig();
  }, []); // Remove onConfigured from dependencies
  
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
      deviceType: deviceType
    };
  
    // Save the configuration and hide the form
    updateShellyConfig(config);
    setIsLoading(false);
    toast({
      title: "Configuration saved",
      description: "Your Shelly device is now configured"
    });
    onConfigured();
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Configure Shelly Device</CardTitle>
        <CardDescription>
          Enter your Shelly device ID and API key to connect to your device
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
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
