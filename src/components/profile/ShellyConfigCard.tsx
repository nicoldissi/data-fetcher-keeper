
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShellyConfig } from "@/lib/types";
import { Trash2, Save } from "lucide-react";

interface ShellyConfigCardProps {
  config: ShellyConfig;
  index: number;
  savingConfig: string | null;
  deletingConfig: string | null;
  onUpdateField: (index: number, field: keyof ShellyConfig, value: string | number) => void;
  onUpdateConfig: (index: number) => void;
  onDeleteConfig: (id: string, index: number) => void;
}

export function ShellyConfigCard({
  config,
  index,
  savingConfig,
  deletingConfig,
  onUpdateField,
  onUpdateConfig,
  onDeleteConfig
}: ShellyConfigCardProps) {
  return (
    <Card key={config.id || `new-${index}`}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>
            <div className="flex items-center space-x-2">
              <Input 
                className="font-semibold text-lg h-8 w-full"
                value={config.name || `Appareil ${index + 1}`}
                onChange={(e) => onUpdateField(index, 'name', e.target.value)}
                placeholder="Nom de l'appareil"
              />
            </div>
          </CardTitle>
        </div>
        <CardDescription>
          Paramètres de connexion à votre appareil Shelly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`deviceId-${index}`}>ID de l'appareil</Label>
          <Input
            id={`deviceId-${index}`}
            placeholder="shellyem3-XXXXXXXXXXXX"
            value={config.deviceId}
            onChange={(e) => onUpdateField(index, 'deviceId', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`apiKey-${index}`}>Clé API</Label>
          <Input
            id={`apiKey-${index}`}
            type="password"
            placeholder="MWRiNzA1dWlk1234567890EXAMPLE"
            value={config.apiKey}
            onChange={(e) => onUpdateField(index, 'apiKey', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`serverUrl-${index}`}>URL du serveur</Label>
          <Input
            id={`serverUrl-${index}`}
            placeholder="https://shelly-12-eu.shelly.cloud"
            value={config.serverUrl}
            onChange={(e) => onUpdateField(index, 'serverUrl', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`deviceType-${index}`}>Type d'appareil</Label>
          <Select
            value={config.deviceType || 'ShellyEM'}
            onValueChange={(value) => onUpdateField(index, 'deviceType', value)}
          >
            <SelectTrigger id={`deviceType-${index}`}>
              <SelectValue placeholder="Sélectionnez le type d'appareil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ShellyEM">Shelly EM</SelectItem>
              <SelectItem value="ShellyProEM">Shelly Pro EM</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`inverterPower-${index}`}>Puissance de l'onduleur (kVA)</Label>
          <Input
            id={`inverterPower-${index}`}
            type="number"
            placeholder="3.0"
            value={config.inverterPowerKva || 3.0}
            onChange={(e) => onUpdateField(index, 'inverterPowerKva', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`gridSubscription-${index}`}>Puissance de l'abonnement réseau (kVA)</Label>
          <Input
            id={`gridSubscription-${index}`}
            type="number"
            placeholder="6.0"
            value={config.gridSubscriptionKva || 6.0}
            onChange={(e) => onUpdateField(index, 'gridSubscriptionKva', parseFloat(e.target.value) || 0)}
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          onClick={() => onUpdateConfig(index)} 
          disabled={savingConfig === (config.id || "new")}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {savingConfig === (config.id || "new") ? "Enregistrement..." : "Enregistrer"}
        </Button>
        
        {config.id && (
          <Button 
            variant="destructive" 
            onClick={() => onDeleteConfig(config.id!, index)}
            disabled={deletingConfig === config.id}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {deletingConfig === config.id ? "Suppression..." : "Supprimer"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
