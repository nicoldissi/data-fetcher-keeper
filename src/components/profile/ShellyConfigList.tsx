
import { Button } from "@/components/ui/button";
import { ShellyConfig } from "@/lib/types";
import { PlusCircle } from "lucide-react";
import { ShellyConfigCard } from "./ShellyConfigCard";

interface ShellyConfigListProps {
  shellyConfigs: ShellyConfig[];
  savingConfig: string | null;
  deletingConfig: string | null;
  updateConfigField: (index: number, field: keyof ShellyConfig, value: string) => void;
  handleUpdateConfig: (index: number) => void;
  handleDeleteConfig: (id: string, index: number) => void;
  handleAddNewConfig: () => void;
}

export function ShellyConfigList({
  shellyConfigs,
  savingConfig,
  deletingConfig,
  updateConfigField,
  handleUpdateConfig,
  handleDeleteConfig,
  handleAddNewConfig
}: ShellyConfigListProps) {
  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Appareils Shelly</h2>
        <Button onClick={handleAddNewConfig} variant="outline" className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4" /> Ajouter un appareil
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {shellyConfigs.map((config, index) => (
          <ShellyConfigCard
            key={config.id || `new-${index}`}
            config={config}
            index={index}
            savingConfig={savingConfig}
            deletingConfig={deletingConfig}
            onUpdateField={updateConfigField}
            onUpdateConfig={handleUpdateConfig}
            onDeleteConfig={handleDeleteConfig}
          />
        ))}
      </div>
    </div>
  );
}
