import { useState } from "react";
import { Trade } from "@/types/trade";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/tradeCalculations";

interface Extracted {
  id_externo: string | null;
  instrumento: string;
  apalancamiento: string | null;
  direccion: "Compra" | "Venta";
  fecha_entrada: string | null;
  fecha_salida: string | null;
  stake_usd: number;
  resultado_usd: number;
}

const toDataUrl = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(f);
  });

/** Sanear: deja solo letras, números y "_" para que el id sea seguro. */
const sanear = (v: string | number) => String(v).replace(/[^A-Za-z0-9]+/g, "_");

/**
 * Ids determinísticos a partir de los datos de la operación: subir dos veces la
 * misma foto vuelve a producir los mismos ids (no duplica), pero dos operaciones
 * distintas nunca comparten id y por eso nunca se pisan entre sí.
 */
export function buildTradesFromPhoto(rows: Extracted[], saldoInicial: number, tipoSesion: "principal" | "practica" = "principal"): Trade[] {
  const now = new Date().toISOString();
  const sorted = [...rows].sort((a, b) => (a.fecha_entrada ?? now).localeCompare(b.fecha_entrada ?? now));
  const usados = new Set<string>();
  let saldo = saldoInicial;
  return sorted.map((r, i) => {
    const antes = saldo;
    saldo = antes + r.resultado_usd;
    const entrada = r.fecha_entrada ?? now;
    const base = `foto-${sanear(entrada)}-${sanear(r.instrumento)}-${sanear(r.direccion)}-${sanear(r.stake_usd)}-${sanear(r.resultado_usd)}`;
    const id = usados.has(base) ? `${base}_${i}` : base;
    usados.add(id);
    return {
      id,
      fecha_entrada: entrada,
      fecha_salida: r.fecha_salida ?? entrada,
      instrumento: r.instrumento,
      moneda: "USD",
      direccion: r.direccion,
      stake_usd: r.stake_usd,
      resultado_usd: r.resultado_usd,
      saldo_antes: antes,
      saldo_despues: saldo,
      riesgo_pct_cuenta: antes ? (r.stake_usd / antes) * 100 : 0,
      resultado_pct_cuenta: antes ? (r.resultado_usd / antes) * 100 : 0,
      tf_principal: "",
      contexto_1h: "",
      posicion_en_canal: r.instrumento,
      tipo_setup: r.apalancamiento ?? "",
      entrada_por: "",
      stop_plan_usd: 0,
      tp_plan_usd: 0,
      motivo_salida: "",
      notas: r.apalancamiento ? `Apalancamiento ${r.apalancamiento} (importado desde foto)` : "Importado desde foto",
      id_externo: r.id_externo ?? undefined,
      tipo_sesion: tipoSesion,
    };
  });
}

export function ImportFromPhoto({ onImport, saldoActual }: { onImport: (t: Trade[]) => void; saldoActual: number }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Extracted[]>([]);
  const [saldo, setSaldo] = useState("");
  const [tipoSesion, setTipoSesion] = useState<"principal" | "practica">("principal");

  const handleFile = async (f?: File) => {
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) return toast.error("La foto es muy pesada (máx 8 MB)");
    setLoading(true);
    setRows([]);
    try {
      const image = await toDataUrl(f);
      const { data, error } = await supabase.functions.invoke("extract-trades-image", { body: { image } });
      if (error || data?.error) throw new Error(data?.error || "No se pudo leer la imagen");
      if (!data.trades.length) toast.error("No encontré operaciones en la foto");
      setRows(data.trades);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error leyendo la foto");
    } finally {
      setLoading(false);
    }
  };

  const confirmar = () => {
    const base = saldo ? Number(saldo) : saldoActual;
    onImport(buildTradesFromPhoto(rows, base, tipoSesion));
    setRows([]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Camera className="h-4 w-4" />
          <span className="hidden sm:inline">Desde Foto</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle>Importar operaciones desde una foto</DialogTitle>
          <DialogDescription>Sube una captura de tu historial (Deriv, IQ Option…). La IA leerá los trades; revísalos antes de guardar.</DialogDescription>
        </DialogHeader>
        <Input type="file" accept="image/*" disabled={loading} onChange={(e) => handleFile(e.target.files?.[0])} />
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Leyendo la foto…
          </div>
        )}
        {rows.length > 0 && (
          <div className="max-h-72 overflow-auto border border-border rounded-md text-sm">
            {rows.map((r, i) => (
              <div key={i} className="flex justify-between gap-2 px-3 py-2 border-b border-border">
                <span className="text-foreground">{r.instrumento} {r.apalancamiento && <span className="text-muted-foreground">{r.apalancamiento}</span>}</span>
                <span className={r.direccion === "Compra" ? "text-success" : "text-destructive"}>{r.direccion}</span>
                <span className="font-mono text-muted-foreground">{r.fecha_entrada?.slice(0, 16).replace("T", " ") ?? "—"}</span>
                <span className="font-mono">${r.stake_usd}</span>
                <span className={`font-mono ${r.resultado_usd >= 0 ? "profit-text" : "loss-text"}`}>{formatCurrency(r.resultado_usd)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Saldo antes de estas operaciones (opcional)</Label>
            <Input type="number" placeholder={String(saldoActual)} value={saldo} onChange={(e) => setSaldo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Sesión</Label>
            <select
              value={tipoSesion}
              onChange={(e) => setTipoSesion(e.target.value as "principal" | "practica")}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="principal">Principal</option>
              <option value="practica">Práctica</option>
            </select>
          </div>
        </div>
        {rows.length > 0 && (
          <Button onClick={confirmar} className="w-full">Guardar {rows.length} operación(es)</Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
