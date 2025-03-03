
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShellyConfig } from '@/lib/types';
import { updateShellyConfig, loadShellyConfig, isShellyConfigValid } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

interface ShellyConfigFormProps {
  onConfigured: () => void;
}

export function ShellyConfigForm({ onConfigured }: ShellyConfigFormProps) {
  const [deviceId, setDeviceId] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // Try to load configuration from localStorage
    if (loadShellyConfig() && isShellyConfigValid()) {
      // Hide the config form if we already have valid configuration
      onConfigured();
    }
  }, [onConfigured]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!deviceId || !apiKey) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please provide both device ID and API key"
      });
      setIsLoading(false);
      return;
    }

    const config: ShellyConfig = {
      deviceId: deviceId.trim(),
      apiKey: apiKey.trim()
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
              placeholder="Enter your Shelly device ID"
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
              placeholder="Enter your Shelly API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
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
