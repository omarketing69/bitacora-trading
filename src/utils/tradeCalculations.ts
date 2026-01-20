import { Trade, TradeStats } from "@/types/trade";

export function calculateTradeStats(trades: Trade[]): TradeStats {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnL: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      bestTrade: 0,
      worstTrade: 0,
    };
  }

  const winningTrades = trades.filter((t) => t.resultado_usd > 0);
  const losingTrades = trades.filter((t) => t.resultado_usd < 0);

  const totalPnL = trades.reduce((sum, t) => sum + t.resultado_usd, 0);
  const totalWins = winningTrades.reduce((sum, t) => sum + t.resultado_usd, 0);
  const totalLosses = Math.abs(
    losingTrades.reduce((sum, t) => sum + t.resultado_usd, 0)
  );

  const avgWin =
    winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
  const avgLoss =
    losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;

  const results = trades.map((t) => t.resultado_usd);
  const bestTrade = Math.max(...results);
  const worstTrade = Math.min(...results);

  return {
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: (winningTrades.length / trades.length) * 100,
    totalPnL,
    avgWin,
    avgLoss,
    profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0,
    bestTrade,
    worstTrade,
  };
}

export function formatCurrency(value: number): string {
  const prefix = value >= 0 ? "+$" : "-$";
  return `${prefix}${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPercentage(value: number): string {
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(entrada: string, salida: string): string {
  const start = new Date(entrada);
  const end = new Date(salida);
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 60) {
    return `${diffMins}m`;
  }
  
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m`;
}
