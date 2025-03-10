
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PVPanel } from "@/lib/types";
import { getPVPanels, createPVPanel, updatePVPanel, deletePVPanel } from "@/lib/api";
import { PlusCircle } from "lucide-react";
import { PVPanelForm } from "./PVPanelForm";
import { toast } from "@/components/ui/use-toast";

interface PVPanelsListProps {
  shellyConfigId: string;
}

export function PVPanelsList({ shellyConfigId }: PVPanelsListProps) {
  const [panels, setPanels] = useState<PVPanel[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPanelId, setSavingPanelId] = useState<string | null>(null);
  const [deletingPanelId, setDeletingPanelId] = useState<string | null>(null);

  useEffect(() => {
    const loadPanels = async () => {
      if (!shellyConfigId) return;
      
      setLoading(true);
      try {
        const data = await getPVPanels(shellyConfigId);
        setPanels(data);
      } catch (error) {
        console.error("Error loading PV panels:", error);
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de charger les panneaux photovoltaïques"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadPanels();
  }, [shellyConfigId]);

  const handleAddPanel = () => {
    const newPanel: PVPanel = {
      shellyConfigId,
      powerWp: 300,
      inclination: 30,
      azimuth: 180,
      name: `Panneau ${panels.length + 1}`
    };
    
    setPanels([...panels, newPanel]);
  };

  const handleSavePanel = async (updatedPanel: PVPanel) => {
    const panelId = updatedPanel.id || 'new';
    setSavingPanelId(panelId);
    
    try {
      let savedPanel;
      
      if (updatedPanel.id) {
        // Update existing panel
        savedPanel = await updatePVPanel(updatedPanel);
      } else {
        // Create new panel
        savedPanel = await createPVPanel(updatedPanel);
      }
      
      if (savedPanel) {
        // Update panels list
        setPanels(prev => 
          prev.map(p => 
            (p.id === savedPanel.id || (p.id === undefined && savedPanel.id && updatedPanel.name === p.name)) 
              ? savedPanel 
              : p
          )
        );
        
        toast({
          title: "Panneau enregistré",
          description: "Le panneau photovoltaïque a été enregistré avec succès"
        });
      } else {
        throw new Error("Échec de l'enregistrement du panneau");
      }
    } catch (error) {
      console.error("Error saving PV panel:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'enregistrer le panneau photovoltaïque"
      });
    } finally {
      setSavingPanelId(null);
    }
  };

  const handleDeletePanel = async (id: string) => {
    setDeletingPanelId(id);
    
    try {
      const success = await deletePVPanel(id);
      
      if (success) {
        // Remove panel from list
        setPanels(prev => prev.filter(p => p.id !== id));
        
        toast({
          title: "Panneau supprimé",
          description: "Le panneau photovoltaïque a été supprimé avec succès"
        });
      } else {
        throw new Error("Échec de la suppression du panneau");
      }
    } catch (error) {
      console.error("Error deleting PV panel:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer le panneau photovoltaïque"
      });
    } finally {
      setDeletingPanelId(null);
    }
  };

  if (loading && panels.length === 0) {
    return <div className="py-4 text-center text-muted-foreground">Chargement des panneaux...</div>;
  }

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Panneaux photovoltaïques</h3>
        <Button 
          onClick={handleAddPanel} 
          variant="outline" 
          size="sm"
          className="flex items-center gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          Ajouter un panneau
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {panels.map((panel, index) => (
          <PVPanelForm
            key={panel.id || `new-${index}`}
            panel={panel}
            onSave={handleSavePanel}
            onDelete={handleDeletePanel}
            isSaving={savingPanelId === (panel.id || 'new')}
            isDeleting={deletingPanelId === panel.id}
          />
        ))}
        
        {panels.length === 0 && (
          <div className="col-span-2 text-center py-6 text-muted-foreground">
            Aucun panneau configuré. Ajoutez un panneau pour commencer.
          </div>
        )}
      </div>
    </div>
  );
}
