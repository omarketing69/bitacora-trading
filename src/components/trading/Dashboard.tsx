import { useState } from "react";
import { Trade } from "@/types/trade";
import { calculateTradeStats, formatCurrency } from "@/utils/tradeCalculations";
import { StatCard } from "./StatCard";
import { TradeRow } from "./TradeRow";
import { TradeDetail } from "./TradeDetail";
import { ImportTrades } from "./ImportTrades";
import {
  TrendingUp,
  Target,
  Award,
  BarChart3,
  Zap,
  Scale,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DashboardProps {
  initialTrades: Trade[];
}

export function Dashboard({ initialTrades }: DashboardProps) {
  const [trades, setTrades] = useState<Trade[]>(initialTrades);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const stats = calculateTradeStats(trades);

  const handleImportTrades = (newTrades: Trade[]) => {
    // Add new trades and sort by fecha_entrada descending
    const allTrades = [...newTrades, ...trades].sort(
      (a, b) => new Date(b.fecha_entrada).getTime() - new Date(a.fecha_entrada).getTime()
    );
    // Remove duplicates by id
    const uniqueTrades = allTrades.filter(
      (trade, index, self) => index === self.findIndex((t) => t.id === trade.id)
    );
    setTrades(uniqueTrades);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gradient">
                  Trading Journal
                </h1>
                <p className="text-xs text-muted-foreground">
                  Bitácora de Operaciones
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ImportTrades onImport={handleImportTrades} />
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Saldo Actual</p>
                <p className="font-mono font-bold text-lg text-foreground">
                  $
                  {trades.length > 0
                    ? trades[0].saldo_despues.toLocaleString()
                    : "0.00"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            title="P&L Total"
            value={formatCurrency(stats.totalPnL)}
            subtitle={`${stats.totalTrades} operaciones`}
            icon={TrendingUp}
            trend={stats.totalPnL >= 0 ? "positive" : "negative"}
          />
          <StatCard
            title="Win Rate"
            value={`${stats.winRate.toFixed(1)}%`}
            subtitle={`${stats.winningTrades}W / ${stats.losingTrades}L`}
            icon={Target}
            trend={stats.winRate >= 50 ? "positive" : "negative"}
          />
          <StatCard
            title="Mejor Trade"
            value={formatCurrency(stats.bestTrade)}
            icon={ChevronUp}
            trend="positive"
          />
          <StatCard
            title="Peor Trade"
            value={formatCurrency(stats.worstTrade)}
            icon={ChevronDown}
            trend="negative"
          />
          <StatCard
            title="Prom. Ganancia"
            value={formatCurrency(stats.avgWin)}
            icon={Award}
            trend="positive"
          />
          <StatCard
            title="Profit Factor"
            value={
              stats.profitFactor === Infinity
                ? "∞"
                : stats.profitFactor.toFixed(2)
            }
            icon={Scale}
            trend={stats.profitFactor >= 1.5 ? "positive" : "neutral"}
          />
        </div>

        {/* Trades List */}
        <div className="bg-card border border-border rounded-lg overflow-hidden glow-border">
          <div className="table-header px-4 py-3 border-b border-border flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span>Historial de Operaciones</span>
            <span className="ml-auto text-xs font-normal normal-case">
              {trades.length} trades
            </span>
          </div>
          <ScrollArea className="h-[500px]">
            {trades.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay operaciones registradas</p>
                <p className="text-sm">Añade tu primera operación para comenzar</p>
              </div>
            ) : (
              trades.map((trade) => (
                <TradeRow
                  key={trade.id}
                  trade={trade}
                  onClick={() => setSelectedTrade(trade)}
                />
              ))
            )}
          </ScrollArea>
        </div>
      </main>

      {/* Trade Detail Modal */}
      <TradeDetail
        trade={selectedTrade}
        open={!!selectedTrade}
        onClose={() => setSelectedTrade(null)}
      />
    </div>
  );
}
