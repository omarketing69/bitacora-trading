import { Trade } from "@/types/trade";
import {
  formatCurrency,
  formatDate,
  formatTime,
  formatDuration,
  formatPercentage,
} from "@/utils/tradeCalculations";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Clock, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TradeRowProps {
  trade: Trade;
  onClick?: () => void;
}

export function TradeRow({ trade, onClick }: TradeRowProps) {
  const isProfit = trade.resultado_usd > 0;
  const isLoss = trade.resultado_usd < 0;

  return (
    <div
      className="trade-row border-b border-border p-4 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        {/* Direction Icon */}
        <div
          className={cn(
            "p-2 rounded-lg",
            trade.direccion === "Compra" ? "profit-bg" : "loss-bg"
          )}
        >
          {trade.direccion === "Compra" ? (
            <ArrowUpRight className="h-5 w-5 profit-text" />
          ) : (
            <ArrowDownRight className="h-5 w-5 loss-text" />
          )}
        </div>

        {/* Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-foreground">
              {trade.instrumento}
            </span>
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                trade.direccion === "Compra"
                  ? "border-success/50 text-success"
                  : "border-destructive/50 text-destructive"
              )}
            >
              {trade.direccion}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {trade.tf_principal}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{formatDate(trade.fecha_entrada)}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(trade.fecha_entrada)}
            </span>
            <span className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              {formatDuration(trade.fecha_entrada, trade.fecha_salida)}
            </span>
          </div>
        </div>

        {/* Setup */}
        <div className="hidden md:block text-right">
          <p className="text-sm text-muted-foreground">{trade.tipo_setup}</p>
          <p className="text-xs text-muted-foreground/70">
            {trade.posicion_en_canal}
          </p>
        </div>

        {/* Stake */}
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Stake</p>
          <p className="font-mono text-sm text-foreground">
            ${trade.stake_usd.toLocaleString()}
          </p>
        </div>

        {/* Result */}
        <div className="text-right min-w-[100px]">
          <p
            className={cn(
              "font-mono font-bold text-lg",
              isProfit && "profit-text",
              isLoss && "loss-text"
            )}
          >
            {formatCurrency(trade.resultado_usd)}
          </p>
          <p
            className={cn(
              "text-xs font-mono",
              isProfit && "profit-text",
              isLoss && "loss-text"
            )}
          >
            {formatPercentage(trade.resultado_pct_cuenta)}
          </p>
        </div>
      </div>
    </div>
  );
}
