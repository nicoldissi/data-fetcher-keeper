
import { ShellyDashboard } from "@/components/ShellyDashboard";
import { SelfConsumptionCard } from "@/components/SelfConsumptionCard";
import { SelfProductionCard } from "@/components/SelfProductionCard";
import { useShellyData } from "@/hooks/useShellyData";

const Index = () => {
  const { currentData } = useShellyData();
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 pt-6 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <SelfConsumptionCard data={currentData} />
          <SelfProductionCard data={currentData} />
        </div>
        <ShellyDashboard />
      </div>
    </div>
  );
};

export default Index;
