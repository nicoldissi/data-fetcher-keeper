
import React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShellyConfig } from "@/lib/types";

interface ShellyConfigCardProps {
  config: ShellyConfig;
  index: number;
  saving: boolean;
  deleting: boolean;
  onUpdateField: (index: number, field: keyof ShellyConfig, value: string | number | null) => void;
  onSave: () => void;
  onDelete: () => void;
}

export function ShellyConfigCard({
  config,
  index,
  saving,
  deleting,
  onUpdateField,
  onSave,
  onDelete,
}: ShellyConfigCardProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{config.name || `Appareil ${index + 1}`}</span>
          {config.id && (
            <Button
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`config-name-${index}`}>Nom de l'appareil</Label>
          <Input
            id={`config-name-${index}`}
            placeholder="Nom de l'appareil"
            value={config.name || ""}
            onChange={(e) => onUpdateField(index, "name", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`device-type-${index}`}>Type d'appareil</Label>
          <Select
            value={config.deviceType || "ShellyEM"}
            onValueChange={(value) => onUpdateField(index, "deviceType", value)}
          >
            <SelectTrigger id={`device-type-${index}`}>
              <SelectValue placeholder="Sélectionner un type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ShellyEM">Shelly EM</SelectItem>
              <SelectItem value="ShellyProEM">Shelly Pro EM</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`inverter-power-${index}`}>Puissance onduleur (kVA)</Label>
            <Input
              id={`inverter-power-${index}`}
              type="number"
              step="0.1"
              placeholder="3.0"
              value={config.inverter_power_kva ?? "3.0"}
              onChange={(e) => onUpdateField(index, "inverter_power_kva", parseFloat(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`grid-subscription-${index}`}>Puissance abonnement (kVA)</Label>
            <Input
              id={`grid-subscription-${index}`}
              type="number"
              step="0.1"
              placeholder="6.0"
              value={config.grid_subscription_kva ?? "6.0"}
              onChange={(e) => onUpdateField(index, "grid_subscription_kva", parseFloat(e.target.value))}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`latitude-${index}`}>Latitude</Label>
            <Input
              id={`latitude-${index}`}
              type="number"
              step="0.000001"
              placeholder="48.8566"
              value={config.latitude ?? ""}
              onChange={(e) => onUpdateField(index, "latitude", e.target.value ? parseFloat(e.target.value) : null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`longitude-${index}`}>Longitude</Label>
            <Input
              id={`longitude-${index}`}
              type="number"
              step="0.000001"
              placeholder="2.3522"
              value={config.longitude ?? ""}
              onChange={(e) => onUpdateField(index, "longitude", e.target.value ? parseFloat(e.target.value) : null)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`device-id-${index}`}>ID de l'appareil Shelly</Label>
          <Input
            id={`device-id-${index}`}
            placeholder="ecfabcc7e123"
            value={config.deviceId || ""}
            onChange={(e) => onUpdateField(index, "deviceId", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`api-key-${index}`}>Clé API Shelly</Label>
          <Input
            id={`api-key-${index}`}
            type="password"
            placeholder="MmIzYzJ1aWQ9..."
            value={config.apiKey || ""}
            onChange={(e) => onUpdateField(index, "apiKey", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`server-url-${index}`}>URL du serveur Shelly</Label>
          <Input
            id={`server-url-${index}`}
            placeholder="https://shelly-12-eu.shelly.cloud"
            value={config.serverUrl || ""}
            onChange={(e) => onUpdateField(index, "serverUrl", e.target.value)}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={onSave}
          disabled={saving}
          className="ml-auto"
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </CardFooter>
    </Card>
  );
}
