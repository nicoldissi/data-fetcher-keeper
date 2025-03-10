
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PVPanel } from "@/lib/types";
import { createPVPanel, updatePVPanel, deletePVPanel } from "@/lib/api";
import { Trash2, Save, Plus } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface PVPanelFormProps {
  panel: PVPanel;
  onSave: (updatedPanel: PVPanel) => void;
  onDelete: (id: string) => void;
  isSaving: boolean;
  isDeleting: boolean;
}

export function PVPanelForm({
  panel,
  onSave,
  onDelete,
  isSaving,
  isDeleting
}: PVPanelFormProps) {
  const [name, setName] = useState(panel.name || '');
  const [powerWp, setPowerWp] = useState(panel.powerWp);
  const [inclination, setInclination] = useState(panel.inclination);
  const [azimuth, setAzimuth] = useState(panel.azimuth);

  const handleSave = () => {
    if (powerWp <= 0) {
      toast({
        variant: "destructive",
        title: "Puissance invalide",
        description: "La puissance doit être supérieure à 0"
      });
      return;
    }

    const updatedPanel = {
      ...panel,
      name,
      powerWp,
      inclination,
      azimuth
    };

    onSave(updatedPanel);
  };

  const handleDelete = () => {
    if (panel.id) {
      onDelete(panel.id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom du panneau"
            className="font-semibold h-8"
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`power-${panel.id || 'new'}`}>Puissance (Watt-peak)</Label>
          <Input
            id={`power-${panel.id || 'new'}`}
            type="number"
            value={powerWp}
            onChange={(e) => setPowerWp(Number(e.target.value))}
            placeholder="300"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`inclination-${panel.id || 'new'}`}>Inclinaison (degrés)</Label>
          <Input
            id={`inclination-${panel.id || 'new'}`}
            type="number"
            value={inclination}
            onChange={(e) => setInclination(Number(e.target.value))}
            placeholder="30"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`azimuth-${panel.id || 'new'}`}>Azimut (degrés)</Label>
          <Input
            id={`azimuth-${panel.id || 'new'}`}
            type="number"
            value={azimuth}
            onChange={(e) => setAzimuth(Number(e.target.value))}
            placeholder="180"
          />
          <p className="text-xs text-muted-foreground">
            0° = Nord, 90° = Est, 180° = Sud, 270° = Ouest
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Enregistrement..." : "Enregistrer"}
        </Button>
        
        {panel.id && (
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "Suppression..." : "Supprimer"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
