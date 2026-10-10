import { useState } from "react";
import { AlertTriangle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { StartSessionInput } from "@/hooks/usePsychSession";
import { EmotionPicker } from "./EmotionPicker";
import { CHECKLIST_PREVIO, INTENSIDAD_ALERTA, PUNTAJE_MINIMO_REAL, emocionPorId } from "./constants";

interface Props {
  busy: boolean;
  saldoSugerido: number;
  onStart: (input: StartSessionInput) => void;
}

export function PreSessionChecklist({ busy, saldoSugerido, onStart }: Props) {
  const [items, setItems] = useState<Record<string, boolean>>({});
  const [emocion, setEmocion] = useState("calma");
  const [intensidad, setIntensidad] = useState(2);
  const [modo, setModo] = useState<"REAL" | "DEMO">("DEMO");
  const [saldo, setSaldo] = useState(saldoSugerido > 0 ? String(saldoSugerido) : "");
  const [payoutMin, setPayoutMin] = useState("80");
  const [aceptoRiesgo, setAceptoRiesgo] = useState(false);

  const marcados = CHECKLIST_PREVIO.filter((i) => items[i.id]).length;
  const puntaje = Math.round((marcados / CHECKLIST_PREVIO.length) * 100);
  const emocionRiesgo = !!emocionPorId(emocion)?.riesgo && intensidad >= INTENSIDAD_ALERTA;
  const preparacionBaja = puntaje < PUNTAJE_MINIMO_REAL;
  const requiereAviso = modo === "REAL" && (emocionRiesgo || preparacionBaja);
  const saldoNum = parseFloat(saldo);
  const puedeIniciar = saldoNum > 0 && (!requiereAviso || aceptoRiesgo) && !busy;

  const start = () =>
    onStart({
      modo,
      puntaje,
      emocion,
      intensidad,
      checklist: {
        items,
        saldo_inicial: saldoNum,
        payout_minimo: parseFloat(payoutMin) || 0,
        advertencia_aceptada: requiereAviso ? aceptoRiesgo : undefined,
      },
    });

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-6 glow-border">
      <div>
        <h2 className="text-lg font-semibold">Preparación antes de operar</h2>
        <p className="text-sm text-muted-foreground">
          Dos minutos aquí te ahorran la operación impulsiva. Sé honesto: nadie más ve esto.
        </p>
      </div>

      <div className="space-y-3">
        {CHECKLIST_PREVIO.map((item) => (
          <label key={item.id} className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={!!items[item.id]}
              onCheckedChange={(v) => setItems((s) => ({ ...s, [item.id]: v === true }))}
              className="mt-0.5"
            />
            <span className="text-sm">{item.texto}</span>
          </label>
        ))}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Preparación</span>
            <span className={cn("font-mono", preparacionBaja ? "loss-text" : "profit-text")}>{puntaje}%</span>
          </div>
          <Progress value={puntaje} />
        </div>
      </div>

      <EmotionPicker
        emocion={emocion}
        intensidad={intensidad}
        onChange={(e, i) => {
          setEmocion(e);
          setIntensidad(i);
        }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Cuenta</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["DEMO", "REAL"] as const).map((m) => (
              <Button key={m} type="button" variant={modo === m ? "default" : "outline"} onClick={() => setModo(m)}>
                {m}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="saldo">Saldo inicial (USD)</Label>
          <Input id="saldo" type="number" inputMode="decimal" min="0" value={saldo} onChange={(e) => setSaldo(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payout-min">Payout mínimo para entrar (%)</Label>
          <Input id="payout-min" type="number" inputMode="numeric" value={payoutMin} onChange={(e) => setPayoutMin(e.target.value)} />
        </div>
      </div>

      {requiereAviso && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 space-y-3">
          <div className="flex gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0 loss-text mt-0.5" />
            <div>
              <p className="font-medium">Hoy no es buen día para cuenta REAL.</p>
              <p className="text-muted-foreground">
                {emocionRiesgo && `Registraste ${emocionPorId(emocion)?.label.toLowerCase()} con intensidad ${intensidad}/5. `}
                {preparacionBaja && `Tu preparación es ${puntaje}% (mínimo recomendado ${PUNTAJE_MINIMO_REAL}%). `}
                Te sugiero operar en DEMO o no operar hoy.
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={aceptoRiesgo} onCheckedChange={(v) => setAceptoRiesgo(v === true)} />
            Entiendo la advertencia y quiero continuar en REAL igualmente
          </label>
        </div>
      )}

      <Button className="w-full gap-2" size="lg" disabled={!puedeIniciar} onClick={start}>
        <PlayCircle className="h-5 w-5" />
        Iniciar sesión de trading
      </Button>
    </div>
  );
}
