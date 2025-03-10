
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";
import { ShellyConfig } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RoofSection {
  id?: string;
  name?: string | null;
  inclination: number;
  azimuth: number;
  power_wp: number;
  shelly_config_id: string;
}

interface RoofSectionsProps {
  shellyConfigs: ShellyConfig[];
  selectedConfigId?: string;
}

export function RoofSections({ shellyConfigs, selectedConfigId }: RoofSectionsProps) {
  const [roofSections, setRoofSections] = useState<RoofSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<string | undefined>(selectedConfigId);

  useEffect(() => {
    if (selectedConfigId && !selectedConfig) {
      setSelectedConfig(selectedConfigId);
    }

    if (shellyConfigs.length > 0 && !selectedConfig) {
      setSelectedConfig(shellyConfigs[0].id);
    }
  }, [shellyConfigs, selectedConfigId, selectedConfig]);

  useEffect(() => {
    const fetchRoofSections = async () => {
      if (!selectedConfig) return;
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('pv_panels')
          .select('*')
          .eq('shelly_config_id', selectedConfig);

        if (error) throw error;
        
        setRoofSections(data || []);
      } catch (error) {
        console.error('Error fetching roof sections:', error);
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de charger les sections de toit"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRoofSections();
  }, [selectedConfig]);

  const handleSaveSection = async (section: RoofSection, index: number) => {
    setSaving(section.id || `new-${index}`);
    
    try {
      let result;
      
      if (section.id) {
        // Update existing section
        const { data, error } = await supabase
          .from('pv_panels')
          .update({
            name: section.name,
            inclination: section.inclination,
            azimuth: section.azimuth,
            power_wp: section.power_wp
          })
          .eq('id', section.id)
          .select('*')
          .single();
          
        if (error) throw error;
        result = data;
      } else {
        // Create new section
        const { data, error } = await supabase
          .from('pv_panels')
          .insert({
            name: section.name || `Section ${index + 1}`,
            inclination: section.inclination,
            azimuth: section.azimuth,
            power_wp: section.power_wp,
            shelly_config_id: section.shelly_config_id
          })
          .select('*')
          .single();
          
        if (error) throw error;
        result = data;
      }
      
      // Update local state
      const newSections = [...roofSections];
      newSections[index] = result;
      setRoofSections(newSections);
      
      toast({
        title: "Section enregistrée",
        description: "La section de toit a été mise à jour avec succès"
      });
    } catch (error) {
      console.error('Error saving roof section:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'enregistrer la section de toit"
      });
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteSection = async (id: string, index: number) => {
    try {
      setSaving(id);
      const { error } = await supabase
        .from('pv_panels')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Update local state
      const newSections = [...roofSections];
      newSections.splice(index, 1);
      setRoofSections(newSections);
      
      toast({
        title: "Section supprimée",
        description: "La section de toit a été supprimée avec succès"
      });
    } catch (error) {
      console.error('Error deleting roof section:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer la section de toit"
      });
    } finally {
      setSaving(null);
    }
  };

  const handleAddSection = () => {
    if (!selectedConfig) return;
    
    const newSection: RoofSection = {
      name: `Section ${roofSections.length + 1}`,
      inclination: 17, // default value
      azimuth: 180, // default value (south)
      power_wp: 0,
      shelly_config_id: selectedConfig
    };
    
    setRoofSections([...roofSections, newSection]);
  };

  const updateSectionField = (index: number, field: keyof RoofSection, value: any) => {
    const newSections = [...roofSections];
    newSections[index] = {
      ...newSections[index],
      [field]: field === 'name' ? value : Number(value)
    };
    setRoofSections(newSections);
  };

  const handleConfigChange = (configId: string) => {
    setSelectedConfig(configId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sections de toit photovoltaïque</CardTitle>
        <CardDescription>
          Configurez les différentes sections de votre installation photovoltaïque
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {shellyConfigs.length > 1 && (
          <div className="space-y-2">
            <Label htmlFor="device-select">Appareil</Label>
            <Select 
              value={selectedConfig} 
              onValueChange={handleConfigChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner un appareil" />
              </SelectTrigger>
              <SelectContent>
                {shellyConfigs.map((config) => (
                  <SelectItem key={config.id} value={config.id || ''}>
                    {config.name || config.deviceId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {loading ? (
          <div className="py-4 text-center">Chargement des sections...</div>
        ) : (
          <>
            {roofSections.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground">
                Aucune section de toit configurée. Cliquez sur "Ajouter une section" pour commencer.
              </div>
            ) : (
              roofSections.map((section, index) => (
                <div key={section.id || `new-${index}`} className="space-y-4 rounded-lg border p-4">
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 space-y-2 min-w-[250px]">
                      <Label htmlFor={`section-name-${index}`}>Nom</Label>
                      <Input 
                        id={`section-name-${index}`}
                        value={section.name || ''}
                        onChange={(e) => updateSectionField(index, 'name', e.target.value)}
                        placeholder="Nom de la section"
                      />
                    </div>
                    <div className="w-32 space-y-2">
                      <Label htmlFor={`section-power-${index}`}>Puissance (Wp)</Label>
                      <Input 
                        id={`section-power-${index}`}
                        type="number"
                        value={section.power_wp}
                        onChange={(e) => updateSectionField(index, 'power_wp', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-4">
                    <div className="w-32 space-y-2">
                      <Label htmlFor={`section-inclination-${index}`}>Inclinaison (°)</Label>
                      <Input 
                        id={`section-inclination-${index}`}
                        type="number"
                        value={section.inclination}
                        onChange={(e) => updateSectionField(index, 'inclination', e.target.value)}
                      />
                    </div>
                    <div className="w-32 space-y-2">
                      <Label htmlFor={`section-azimuth-${index}`}>Azimuth (°)</Label>
                      <Input 
                        id={`section-azimuth-${index}`}
                        type="number"
                        value={section.azimuth}
                        onChange={(e) => updateSectionField(index, 'azimuth', e.target.value)}
                      />
                    </div>
                    <div className="flex-1 flex items-end justify-end">
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleSaveSection(section, index)}
                          disabled={saving === section.id || saving === `new-${index}`}
                        >
                          {saving === section.id || saving === `new-${index}` ? 'Enregistrement...' : 'Enregistrer'}
                        </Button>
                        {section.id && (
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteSection(section.id!, index)}
                            disabled={saving === section.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          variant="outline" 
          onClick={handleAddSection}
          disabled={!selectedConfig || loading}
          className="flex items-center"
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une section
        </Button>
      </CardFooter>
    </Card>
  );
}
