import { Dashboard } from "@/components/trading/Dashboard";
import { sampleTrades } from "@/data/trades";

const Index = () => {
  return <Dashboard trades={sampleTrades} />;
};

export default Index;
