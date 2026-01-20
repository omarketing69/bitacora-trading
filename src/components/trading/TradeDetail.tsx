import { Trade } from "@/types/trade";
import {
  formatCurrency,
  formatDate,
  formatTime,
  formatDuration,
  formatPercentage,
} from "@/utils/tradeCalculations";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Clock,
  Target,
  TrendingDown,
  TrendingUp,
  FileText,
} from "lucide-react";

interface TradeDetailProps {
  trade: Trade | null;
  open: boolean;
  onClose: () => void;
}

export function TradeDetail({ trade, open, onClose }: TradeDetailProps) {
  if (!trade) return null;

  const isProfit = trade.resultado_usd > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "p-2 rounded-lg",
                trade.direccion === "Compra" ? "profit-bg" : "loss-bg"
              )}
            >
              {trade.direccion === "Compra" ? (
                <ArrowUpRight className="h-6 w-6 profit-text" />
              ) : (
                <ArrowDownRight className="h-6 w-6 loss-text" />
              )}
            </div>
            <div>
              <DialogTitle className="text-xl">
                {trade.instrumento}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className={cn(
                    trade.direccion === "Compra"
                      ? "border-success/50 text-success"
                      : "border-destructive/50 text-destructive"
                  )}
                >
                  {trade.direccion}
                </Badge>
                <Badge variant="secondary">{trade.tf_principal}</Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  ID: {trade.id}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Result Summary */}
          <div
            className={cn(
              "p-4 rounded-lg",
              isProfit ? "profit-bg" : "loss-bg"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Resultado</p>
                <p
                  className={cn(
                    "text-3xl font-bold font-mono",
                    isProfit ? "profit-text" : "loss-text"
                  )}
                >
                  {formatCurrency(trade.resultado_usd)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">% Cuenta</p>
                <p
                  className={cn(
                    "text-2xl font-bold font-mono",
                    isProfit ? "profit-text" : "loss-text"
                  )}
                >
                  {formatPercentage(trade.resultado_pct_cuenta)}
                </p>
              </div>
            </div>
          </div>

          {/* Time Info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="stat-card">
              <Calendar className="h-4 w-4 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Fecha</p>
              <p className="font-medium">{formatDate(trade.fecha_entrada)}</p>
            </div>
            <div className="stat-card">
              <Clock className="h-4 w-4 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Hora Entrada</p>
              <p className="font-mono">{formatTime(trade.fecha_entrada)}</p>
            </div>
            <div className="stat-card">
              <Target className="h-4 w-4 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Duración</p>
              <p className="font-mono">
                {formatDuration(trade.fecha_entrada, trade.fecha_salida)}
              </p>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Financial Details */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Detalles Financieros
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="stat-card">
                <p className="text-xs text-muted-foreground">Stake</p>
                <p className="font-mono font-semibold">
                  ${trade.stake_usd.toLocaleString()}
                </p>
              </div>
              <div className="stat-card">
                <p className="text-xs text-muted-foreground">Riesgo</p>
                <p className="font-mono">{trade.riesgo_pct_cuenta}%</p>
              </div>
              <div className="stat-card">
                <p className="text-xs text-muted-foreground">SL Plan</p>
                <p className="font-mono loss-text">
                  -${trade.stop_plan_usd}
                </p>
              </div>
              <div className="stat-card">
                <p className="text-xs text-muted-foreground">TP Plan</p>
                <p className="font-mono profit-text">
                  +${trade.tp_plan_usd}
                </p>
              </div>
            </div>
          </div>

          {/* Balance Changes */}
          <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Saldo Antes</p>
              <p className="font-mono text-lg">
                ${trade.saldo_antes.toLocaleString()}
              </p>
            </div>
            <div className="text-2xl text-muted-foreground">→</div>
            <div className="flex-1 text-right">
              <p className="text-xs text-muted-foreground">Saldo Después</p>
              <p className="font-mono text-lg">
                ${trade.saldo_despues.toLocaleString()}
              </p>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Technical Analysis */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Análisis Técnico
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="stat-card">
                <p className="text-xs text-muted-foreground">Contexto 1H</p>
                <p className="text-sm">{trade.contexto_1h}</p>
              </div>
              <div className="stat-card">
                <p className="text-xs text-muted-foreground">Posición Canal</p>
                <p className="text-sm">{trade.posicion_en_canal}</p>
              </div>
              <div className="stat-card">
                <p className="text-xs text-muted-foreground">Tipo Setup</p>
                <p className="text-sm font-medium">{trade.tipo_setup}</p>
              </div>
              <div className="stat-card">
                <p className="text-xs text-muted-foreground">Entrada Por</p>
                <p className="text-sm">{trade.entrada_por}</p>
              </div>
            </div>
          </div>

          {/* Exit Reason */}
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              {isProfit ? (
                <TrendingUp className="h-4 w-4 profit-text" />
              ) : (
                <TrendingDown className="h-4 w-4 loss-text" />
              )}
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Motivo de Salida
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "font-mono",
                isProfit
                  ? "border-success/50 text-success"
                  : "border-destructive/50 text-destructive"
              )}
            >
              {trade.motivo_salida}
            </Badge>
          </div>

          {/* Notes */}
          {trade.notas && (
            <div className="stat-card">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Notas
                </p>
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                {trade.notas}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
