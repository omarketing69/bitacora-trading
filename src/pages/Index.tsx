import { Dashboard } from "@/components/trading/Dashboard";
import { sampleTrades } from "@/data/trades";

const Index = () => {
  return <Dashboard initialTrades={sampleTrades} />;
};

export default Index;
