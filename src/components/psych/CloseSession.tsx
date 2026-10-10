import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/utils/tradeCalculations";
import type { Ciclo } from "@/lib/psych/protocol";
import { EmotionPicker } from "./EmotionPicker";
import { MOTIVOS_CIERRE } from "./constants";

interface Props {
  motivo: string;
  ciclos: Ciclo[];
  busy: boolean;
  onClose: (input: { motivo: string; emocionFinal: string; reflexion: string }) => void;
  onCancel?: () => void;
}

const MENSAJES: Record<string, string> = {
  objetivo_ganancias:
    "Cumpliste tu objetivo. Lo más difícil viene ahora: cerrar con ganancias en lugar de seguir operando por euforia.",
  limite_perdida:
    "Perder un ciclo es parte del sistema. Lo que construye tu disciplina es cerrar aquí, no la operación en sí.",
  recuperacion:
    "Hubo una entrada para recuperar. No te castigues: haberla registrado es el primer paso para que no se repita.",
  manual: "Cerrar a tiempo también es una decisión de trader.",
};

export function CloseSession({ motivo, ciclos, busy, onClose, onCancel }: Props) {
  const [emocion, setEmocion] = useState("calma");
  const [intensidad, setIntensidad] = useState(2);
  const [reflexion, setReflexion] = useState("");

  const pnl = ciclos.reduce((s, c) => s + c.resultado, 0);
  const ganados = ciclos.filter((c) => c.estado === "ganado").length;
  const perdidos = ciclos.filter((c) => c.estado === "perdido").length;
  const pasos = ciclos.flatMap((c) => c.pasos);
  const cumplidas = pasos.filter((p) => p.cumplio_reglas).length;

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-6 glow-border">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{MOTIVOS_CIERRE[motivo] ?? "Fin de la sesión"}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{MENSAJES[motivo] ?? MENSAJES.manual}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <Resumen titulo="Resultado" valor={formatCurrency(pnl)} clase={pnl >= 0 ? "profit-text" : "loss-text"} />
        <Resumen titulo="Ciclos" valor={`${ganados}G / ${perdidos}P`} />
        <Resumen titulo="Entradas" valor={String(pasos.length)} />
        <Resumen titulo="Con reglas" valor={`${cumplidas}/${pasos.length}`} />
      </div>

      <EmotionPicker
        label="¿Cómo terminas la sesión?"
        emocion={emocion}
        intensidad={intensidad}
        onChange={(e, i) => {
          setEmocion(e);
          setIntensidad(i);
        }}
      />

      <div className="space-y-1.5">
        <p className="text-sm font-medium">Una lección de hoy (opcional)</p>
        <Textarea rows={3} value={reflexion} onChange={(e) => setReflexion(e.target.value)} placeholder="Ej: esperé el retesteo y no forcé la entrada." />
      </div>

      <div className="flex gap-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Volver
          </Button>
        )}
        <Button className="flex-1" disabled={busy} onClick={() => onClose({ motivo, emocionFinal: emocion, reflexion })}>
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}

function Resumen({ titulo, valor, clase }: { titulo: string; valor: string; clase?: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{titulo}</p>
      <p className={`font-mono font-bold text-lg ${clase ?? ""}`}>{valor}</p>
    </div>
  );
}
