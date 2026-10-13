import { useState } from "react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { EntryInput, Resultado } from "@/hooks/usePsychSession";
import { EmotionPicker } from "./EmotionPicker";
import { CONTEXTOS_15M, EXPIRACION_DEFECTO_SEG, INTENSIDAD_ALERTA, PAYOUT_DEFECTO_IQ, SENALES_EMA, emocionPorId } from "./constants";

export type EntryMode = "nueva" | "mejora" | "fuera_protocolo";

interface Props {
  mode: EntryMode;
  busy: boolean;
  payoutMinimo: number;
  defaults: Partial<Pick<EntryInput, "activo" | "direccion" | "stake" | "payout" | "emaSenal" | "contexto15m">>;
  onSubmit: (input: EntryInput) => void;
  onCancel?: () => void;
}

const TITULOS: Record<EntryMode, { titulo: string; ayuda: string; boton: string }> = {
  nueva: {
    titulo: "Nueva entrada",
    ayuda: "Regístrala justo antes de abrirla en IQ Option.",
    boton: "Registrar entrada",
  },
  mejora: {
    titulo: "Mejora de entrada (paso 2)",
    ayuda: "Tu entrada anterior sigue abierta y el precio te dio un mejor punto. Misma idea, misma expiración.",
    boton: "Registrar mejora de entrada",
  },
  fuera_protocolo: {
    titulo: "Registrar entrada fuera del protocolo",
    ayuda: "Si abriste otra operación después de perder, regístrala igual. Ser honesto aquí es lo que te hace mejorar.",
    boton: "Registrar con honestidad",
  },
};

export function EntryForm({ mode, busy, payoutMinimo, defaults, onSubmit, onCancel }: Props) {
  const [activo, setActivo] = useState(defaults.activo ?? "EUR/USD");
  const [direccion, setDireccion] = useState<"Compra" | "Venta">(defaults.direccion ?? "Compra");
  const [stake, setStake] = useState(defaults.stake ? String(defaults.stake) : "");
  const [payout, setPayout] = useState(defaults.payout ? String(defaults.payout) : String(PAYOUT_DEFECTO_IQ));
  const [emaSenal, setEmaSenal] = useState(defaults.emaSenal ?? "");
  const [contexto15m, setContexto15m] = useState(defaults.contexto15m ?? "");
  const [emocion, setEmocion] = useState("calma");
  const [intensidad, setIntensidad] = useState(2);
  const [cumpleReglas, setCumpleReglas] = useState(mode !== "fuera_protocolo");
  const [notas, setNotas] = useState("");
  const [resultado, setResultado] = useState<Resultado | "">("");

  const t = TITULOS[mode];
  const bloqueaDireccion = mode === "mejora";
  const payoutNum = parseFloat(payout);
  const stakeNum = parseFloat(stake);
  const payoutBajo = payoutNum > 0 && payoutNum < payoutMinimo;
  const emocionRiesgo = !!emocionPorId(emocion)?.riesgo && intensidad >= INTENSIDAD_ALERTA;
  const contraContexto =
    (direccion === "Compra" && contexto15m === "Tendencia bajista") ||
    (direccion === "Venta" && contexto15m === "Tendencia alcista");
  const valido =
    activo.trim() && stakeNum > 0 && payoutNum > 0 && !busy && (mode !== "fuera_protocolo" || resultado !== "");

  const submit = () =>
    onSubmit({
      activo: activo.trim().toUpperCase(),
      direccion,
      stake: stakeNum,
      payout: payoutNum,
      expiracionSeg: EXPIRACION_DEFECTO_SEG,
      emaSenal,
      contexto15m,
      emocion,
      intensidad,
      cumpleReglas,
      notas,
      resultado: mode === "fuera_protocolo" && resultado ? resultado : undefined,
    });

  const avisos = [
    payoutBajo && `Payout ${payoutNum}% por debajo de tu mínimo (${payoutMinimo}%).`,
    contraContexto && "La dirección va en contra del contexto de 15 minutos.",
    emocionRiesgo && "Emoción intensa de riesgo: considera no entrar.",
    !cumpleReglas && "Marcaste que esta entrada no cumple tus reglas.",
  ].filter(Boolean) as string[];

  return (
    <div className={cn("bg-card border rounded-lg p-5 space-y-5", mode === "fuera_protocolo" ? "border-destructive/40" : "border-border")}>
      <div>
        <h3 className="font-semibold">{t.titulo}</h3>
        <p className="text-sm text-muted-foreground">{t.ayuda}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label htmlFor="activo">Activo</Label>
          <Input id="activo" value={activo} disabled={bloqueaDireccion} onChange={(e) => setActivo(e.target.value)} />
        </div>
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label>Dirección</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              disabled={bloqueaDireccion}
              variant={direccion === "Compra" ? "default" : "outline"}
              className={cn("gap-1", direccion === "Compra" && "bg-success text-success-foreground hover:bg-success/90")}
              onClick={() => setDireccion("Compra")}
            >
              <ArrowUpRight className="h-4 w-4" /> CALL
            </Button>
            <Button
              type="button"
              disabled={bloqueaDireccion}
              variant={direccion === "Venta" ? "default" : "outline"}
              className={cn("gap-1", direccion === "Venta" && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
              onClick={() => setDireccion("Venta")}
            >
              <ArrowDownRight className="h-4 w-4" /> PUT
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stake">Importe (USD)</Label>
          <Input id="stake" type="number" inputMode="decimal" min="0" value={stake} onChange={(e) => setStake(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="payout">Payout (%)</Label>
          <Input id="payout" type="number" inputMode="numeric" min="0" value={payout} onChange={(e) => setPayout(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Señal de EMAs</Label>
          <Select value={emaSenal} onValueChange={setEmaSenal}>
            <SelectTrigger>
              <SelectValue placeholder="Elige la señal" />
            </SelectTrigger>
            <SelectContent>
              {SENALES_EMA.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Contexto 15 min</Label>
          <Select value={contexto15m} onValueChange={setContexto15m}>
            <SelectTrigger>
              <SelectValue placeholder="Elige el contexto" />
            </SelectTrigger>
            <SelectContent>
              {CONTEXTOS_15M.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <EmotionPicker
        label="¿Qué sientes justo antes de entrar?"
        emocion={emocion}
        intensidad={intensidad}
        onChange={(e, i) => {
          setEmocion(e);
          setIntensidad(i);
        }}
      />

      <label className="flex items-center justify-between gap-4 rounded-lg border border-border p-3 cursor-pointer">
        <span className="text-sm">
          <span className="font-medium">¿Cumple todas tus reglas?</span>
          <span className="block text-muted-foreground text-xs">Setup de EMAs, contexto, payout y estado emocional.</span>
        </span>
        <Switch checked={cumpleReglas} onCheckedChange={setCumpleReglas} />
      </label>

      {mode === "fuera_protocolo" && (
        <div className="space-y-1.5">
          <Label>¿Cómo terminó?</Label>
          <div className="grid grid-cols-3 gap-2">
            {(["ganada", "perdida", "empate"] as const).map((r) => (
              <Button key={r} type="button" variant={resultado === r ? "default" : "outline"} onClick={() => setResultado(r)}>
                {r === "ganada" ? "Ganó" : r === "perdida" ? "Perdió" : "Empate"}
              </Button>
            ))}
          </div>
        </div>
      )}

      {mode === "fuera_protocolo" && (
        <div className="space-y-1.5">
          <Label htmlFor="notas">¿Qué te llevó a entrar?</Label>
          <Textarea id="notas" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej: quería recuperar rápido, vi una vela grande..." />
        </div>
      )}

      {avisos.length > 0 && (
        <ul className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 space-y-1 text-sm">
          {avisos.map((a) => (
            <li key={a} className="flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 loss-text mt-0.5" />
              {a}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="button" className="flex-1" disabled={!valido} onClick={submit}>
          {avisos.length > 0 && mode !== "fuera_protocolo" ? "Entrar de todos modos" : t.boton}
        </Button>
      </div>
    </div>
  );
}
