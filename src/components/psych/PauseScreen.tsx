import { useState } from "react";
import { Hourglass, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { PREGUNTAS_PAUSA } from "./constants";

interface Props {
  hasta: Date;
  ahora: Date;
  titulo: string;
  onImpulso: (intensidad: number) => void;
  onNota: (respuestas: Record<string, string>) => void;
}

const FASES = ["Inhala", "Sostén", "Exhala", "Sostén"];

/** Pausa obligatoria tras una pérdida: respiración, registro de impulsos y reflexión guiada. */
export function PauseScreen({ hasta, ahora, titulo, onImpulso, onNota }: Props) {
  const [impulso, setImpulso] = useState(3);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [guardado, setGuardado] = useState(false);

  const restanteMs = Math.max(0, hasta.getTime() - ahora.getTime());
  const min = Math.floor(restanteMs / 60000);
  const seg = Math.floor((restanteMs % 60000) / 1000);
  // Respiración cuadrada: 4 fases de 4 segundos
  const segundoCiclo = Math.floor(ahora.getTime() / 1000) % 16;
  const fase = FASES[Math.floor(segundoCiclo / 4)];
  const cuenta = 4 - (segundoCiclo % 4);

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-6 glow-border">
      <div className="text-center space-y-2">
        <Hourglass className="h-8 w-8 mx-auto text-primary" />
        <h2 className="text-lg font-semibold">{titulo}</h2>
        <p className="text-sm text-muted-foreground">
          La bitácora no acepta nuevas entradas en esta sesión. Usa estos minutos para soltar la pérdida, no para buscar la
          siguiente operación.
        </p>
        <p className="font-mono text-5xl font-bold tabular-nums" aria-live="polite">
          {String(min).padStart(2, "0")}:{String(seg).padStart(2, "0")}
        </p>
      </div>

      <div className="rounded-lg bg-muted/50 p-4 text-center space-y-2">
        <Wind className="h-5 w-5 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Respiración cuadrada</p>
        <p className="text-2xl font-semibold">
          {fase} <span className="font-mono">{cuenta}</span>
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">¿Cuántas ganas tienes de recuperar ahora mismo?</p>
        <Slider min={1} max={5} step={1} value={[impulso]} onValueChange={([v]) => setImpulso(v)} />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Ninguna</span>
          <span className="font-mono text-foreground">{impulso} / 5</span>
          <span>Muchísimas</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => onImpulso(impulso)}>
          Registrar impulso
        </Button>
        <p className="text-xs text-muted-foreground">
          Registrarlo varias veces durante la pausa te muestra cómo el impulso baja solo si no actúas sobre él.
        </p>
      </div>

      <div className="space-y-4">
        {PREGUNTAS_PAUSA.map((p) => (
          <div key={p} className="space-y-1.5">
            <p className="text-sm">{p}</p>
            <Textarea
              rows={2}
              value={respuestas[p] ?? ""}
              onChange={(e) => {
                setGuardado(false);
                setRespuestas((r) => ({ ...r, [p]: e.target.value }));
              }}
            />
          </div>
        ))}
        <Button
          variant="secondary"
          disabled={guardado || Object.values(respuestas).every((v) => !v.trim())}
          onClick={() => {
            onNota(respuestas);
            setGuardado(true);
          }}
        >
          {guardado ? "Reflexión guardada" : "Guardar reflexión"}
        </Button>
      </div>
    </div>
  );
}
