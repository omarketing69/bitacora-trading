import { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Clock,
  Target,
  TrendingDown,
  TrendingUp,
  FileText,
  Pencil,
  Check,
  X,
} from "lucide-react";

interface TradeDetailProps {
  trade: Trade | null;
  open: boolean;
  onClose: () => void;
  onUpdate?: (tradeId: string, updates: Partial<Trade>) => Promise<boolean>;
}

export function TradeDetail({ trade, open, onClose, onUpdate }: TradeDetailProps) {
  const [isEditingMotivo, setIsEditingMotivo] = useState(false);
  const [isEditingNotas, setIsEditingNotas] = useState(false);
  const [isEditingTipoActivo, setIsEditingTipoActivo] = useState(false);
  const [isEditingDireccion, setIsEditingDireccion] = useState(false);
  const [isEditingEntradaPor, setIsEditingEntradaPor] = useState(false);
  const [isEditingContexto, setIsEditingContexto] = useState(false);
  
  const [motivoSalida, setMotivoSalida] = useState("");
  const [notas, setNotas] = useState("");
  const [tipoActivo, setTipoActivo] = useState("");
  const [direccion, setDireccion] = useState<"Compra" | "Venta">("Compra");
  const [entradaPor, setEntradaPor] = useState("");
  const [contexto1h, setContexto1h] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (trade) {
      setMotivoSalida(trade.motivo_salida || "");
      setNotas(trade.notas || "");
      setTipoActivo(trade.posicion_en_canal || "");
      setDireccion(trade.direccion);
      setEntradaPor(trade.entrada_por || "");
      setContexto1h(trade.contexto_1h || "");
    }
  }, [trade]);

  if (!trade) return null;

  const isProfit = trade.resultado_usd > 0;

  const handleSaveMotivo = async () => {
    if (!onUpdate) return;
    setIsSaving(true);
    const success = await onUpdate(trade.id, { motivo_salida: motivoSalida });
    setIsSaving(false);
    if (success) {
      setIsEditingMotivo(false);
    }
  };

  const handleSaveNotas = async () => {
    if (!onUpdate) return;
    setIsSaving(true);
    const success = await onUpdate(trade.id, { notas });
    setIsSaving(false);
    if (success) {
      setIsEditingNotas(false);
    }
  };

  const handleSaveTipoActivo = async () => {
    if (!onUpdate) return;
    setIsSaving(true);
    const success = await onUpdate(trade.id, { posicion_en_canal: tipoActivo });
    setIsSaving(false);
    if (success) {
      setIsEditingTipoActivo(false);
    }
  };

  const handleSaveDireccion = async () => {
    if (!onUpdate) return;
    setIsSaving(true);
    const success = await onUpdate(trade.id, { direccion });
    setIsSaving(false);
    if (success) {
      setIsEditingDireccion(false);
    }
  };

  const handleSaveEntradaPor = async () => {
    if (!onUpdate) return;
    setIsSaving(true);
    const success = await onUpdate(trade.id, { entrada_por: entradaPor });
    setIsSaving(false);
    if (success) {
      setIsEditingEntradaPor(false);
    }
  };

  const handleSaveContexto = async () => {
    if (!onUpdate) return;
    setIsSaving(true);
    const success = await onUpdate(trade.id, { contexto_1h: contexto1h });
    setIsSaving(false);
    if (success) {
      setIsEditingContexto(false);
    }
  };

  const handleCancelMotivo = () => {
    setMotivoSalida(trade.motivo_salida || "");
    setIsEditingMotivo(false);
  };

  const handleCancelNotas = () => {
    setNotas(trade.notas || "");
    setIsEditingNotas(false);
  };

  const handleCancelTipoActivo = () => {
    setTipoActivo(trade.posicion_en_canal || "");
    setIsEditingTipoActivo(false);
  };

  const handleCancelDireccion = () => {
    setDireccion(trade.direccion);
    setIsEditingDireccion(false);
  };

  const handleCancelEntradaPor = () => {
    setEntradaPor(trade.entrada_por || "");
    setIsEditingEntradaPor(false);
  };

  const handleCancelContexto = () => {
    setContexto1h(trade.contexto_1h || "");
    setIsEditingContexto(false);
  };

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
              Información del Trade
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {/* Tipo de Activo (usando posicion_en_canal) */}
              <div className="stat-card">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Tipo de Activo</p>
                  {onUpdate && !isEditingTipoActivo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingTipoActivo(true)}
                      className="h-5 w-5 p-0"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {isEditingTipoActivo ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={tipoActivo}
                      onChange={(e) => setTipoActivo(e.target.value)}
                      placeholder="Ej: Boom 1000, Crash 1000..."
                      className="h-7 text-xs"
                      disabled={isSaving}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveTipoActivo}
                      disabled={isSaving}
                      className="h-7 w-7 p-0 text-success hover:text-success"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelTipoActivo}
                      disabled={isSaving}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm font-medium">{trade.posicion_en_canal || "Sin especificar"}</p>
                )}
              </div>

              {/* Dirección (Compra/Venta) */}
              <div className="stat-card">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Dirección</p>
                  {onUpdate && !isEditingDireccion && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingDireccion(true)}
                      className="h-5 w-5 p-0"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {isEditingDireccion ? (
                  <div className="flex items-center gap-1">
                    <select
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value as "Compra" | "Venta")}
                      className="h-7 text-xs rounded-md border border-input bg-background px-2 flex-1"
                      disabled={isSaving}
                    >
                      <option value="Compra">Compra</option>
                      <option value="Venta">Venta</option>
                    </select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveDireccion}
                      disabled={isSaving}
                      className="h-7 w-7 p-0 text-success hover:text-success"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelDireccion}
                      disabled={isSaving}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-medium",
                      trade.direccion === "Compra"
                        ? "border-success/50 text-success"
                        : "border-destructive/50 text-destructive"
                    )}
                  >
                    {trade.direccion}
                  </Badge>
                )}
              </div>

              {/* Entrada Por */}
              <div className="stat-card">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Entrada Por</p>
                  {onUpdate && !isEditingEntradaPor && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingEntradaPor(true)}
                      className="h-5 w-5 p-0"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {isEditingEntradaPor ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={entradaPor}
                      onChange={(e) => setEntradaPor(e.target.value)}
                      placeholder="Ej: Vela de tren, Spike..."
                      className="h-7 text-xs"
                      disabled={isSaving}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveEntradaPor}
                      disabled={isSaving}
                      className="h-7 w-7 p-0 text-success hover:text-success"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEntradaPor}
                      disabled={isSaving}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm">{trade.entrada_por || "Sin especificar"}</p>
                )}
              </div>

              {/* Contexto 1H */}
              <div className="stat-card">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Contexto / Notas Técnicas</p>
                  {onUpdate && !isEditingContexto && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingContexto(true)}
                      className="h-5 w-5 p-0"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {isEditingContexto ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={contexto1h}
                      onChange={(e) => setContexto1h(e.target.value)}
                      placeholder="Contexto técnico..."
                      className="h-7 text-xs"
                      disabled={isSaving}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveContexto}
                      disabled={isSaving}
                      className="h-7 w-7 p-0 text-success hover:text-success"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelContexto}
                      disabled={isSaving}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm">{trade.contexto_1h || "Sin especificar"}</p>
                )}
              </div>
            </div>
          </div>

          {/* Exit Reason */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isProfit ? (
                  <TrendingUp className="h-4 w-4 profit-text" />
                ) : (
                  <TrendingDown className="h-4 w-4 loss-text" />
                )}
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Motivo de Salida
                </p>
              </div>
              {onUpdate && !isEditingMotivo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingMotivo(true)}
                  className="h-6 w-6 p-0"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>
            {isEditingMotivo ? (
              <div className="flex items-center gap-2">
                <Input
                  value={motivoSalida}
                  onChange={(e) => setMotivoSalida(e.target.value)}
                  placeholder="Motivo de salida..."
                  className="h-8 text-sm"
                  disabled={isSaving}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSaveMotivo}
                  disabled={isSaving}
                  className="h-8 w-8 p-0 text-success hover:text-success"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelMotivo}
                  disabled={isSaving}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Badge
                variant="outline"
                className={cn(
                  "font-mono",
                  isProfit
                    ? "border-success/50 text-success"
                    : "border-destructive/50 text-destructive"
                )}
              >
                {trade.motivo_salida || "Sin especificar"}
              </Badge>
            )}
          </div>

          {/* Notes */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Notas
                </p>
              </div>
              {onUpdate && !isEditingNotas && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingNotas(true)}
                  className="h-6 w-6 p-0"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>
            {isEditingNotas ? (
              <div className="space-y-2">
                <Textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Notas sobre el trade..."
                  className="text-sm min-h-[80px]"
                  disabled={isSaving}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelNotas}
                    disabled={isSaving}
                    className="h-8 text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveNotas}
                    disabled={isSaving}
                    className="h-8 text-success hover:text-success"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Guardar
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-foreground leading-relaxed">
                {trade.notas || "Sin notas"}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
