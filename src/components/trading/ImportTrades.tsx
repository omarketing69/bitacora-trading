import { useState } from "react";
import { Trade } from "@/types/trade";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ClipboardPaste, Plus, Check, AlertCircle, X, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ImportTradesProps {
  onImport: (trades: Trade[]) => void;
}

// Column headers mapping (Spanish names to Trade fields)
const COLUMN_HEADERS = [
  "id",
  "fecha_entrada",
  "fecha_salida",
  "instrumento",
  "moneda",
  "direccion",
  "stake_usd",
  "resultado_usd",
  "saldo_antes",
  "saldo_despues",
  "riesgo_pct_cuenta",
  "resultado_pct_cuenta",
  "tf_principal",
  "contexto_1h",
  "posicion_en_canal",
  "tipo_setup",
  "entrada_por",
  "stop_plan_usd",
  "tp_plan_usd",
  "motivo_salida",
  "notas",
] as const;

const REQUIRED_FIELDS = [
  "id",
  "fecha_entrada",
  "fecha_salida",
  "instrumento",
  "direccion",
  "stake_usd",
  "resultado_usd",
  "saldo_antes",
  "saldo_despues",
];

export function ImportTrades({ onImport }: ImportTradesProps) {
  const [open, setOpen] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Trade[]>([]);

  const detectDelimiter = (text: string): string => {
    const firstLine = text.split("\n")[0];
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;

    if (tabCount >= commaCount && tabCount >= semicolonCount) return "\t";
    if (semicolonCount >= commaCount) return ";";
    return ",";
  };

  const parseNumber = (value: string): number => {
    if (!value || value.trim() === "") return 0;
    // Handle both comma and dot as decimal separators
    const normalized = value.replace(",", ".").trim();
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  };

  const parseTabularData = (input: string): Trade[] => {
    const lines = input.trim().split("\n").filter(line => line.trim());
    if (lines.length === 0) return [];

    const delimiter = detectDelimiter(input);
    const trades: Trade[] = [];

    // Check if first line is a header row
    const firstLineCells = lines[0].split(delimiter);
    const isHeader = firstLineCells.some(cell => 
      COLUMN_HEADERS.includes(cell.trim().toLowerCase() as any) ||
      cell.trim().toLowerCase() === "id"
    );

    const dataLines = isHeader ? lines.slice(1) : lines;

    for (const line of dataLines) {
      const cells = line.split(delimiter).map(cell => cell.trim());
      
      if (cells.length < 9) continue; // Need at least required fields

      const trade: Partial<Trade> = {};

      // Map cells to Trade fields based on position
      COLUMN_HEADERS.forEach((field, index) => {
        const value = cells[index] || "";
        
        switch (field) {
          case "stake_usd":
          case "resultado_usd":
          case "saldo_antes":
          case "saldo_despues":
          case "riesgo_pct_cuenta":
          case "resultado_pct_cuenta":
          case "stop_plan_usd":
          case "tp_plan_usd":
            (trade as any)[field] = parseNumber(value);
            break;
          case "direccion":
            (trade as any)[field] = value || "Compra";
            break;
          case "moneda":
            (trade as any)[field] = value || "USD";
            break;
          default:
            (trade as any)[field] = value;
        }
      });

      // Validate required fields
      const hasRequiredFields = REQUIRED_FIELDS.every(field => {
        const val = (trade as any)[field];
        return val !== undefined && val !== null && val !== "";
      });

      if (hasRequiredFields) {
        trades.push(trade as Trade);
      }
    }

    return trades;
  };

  const parseInput = (input: string) => {
    setError(null);
    setPreview([]);

    if (!input.trim()) return;

    try {
      // Try JSON first
      const parsed = JSON.parse(input);
      const trades: any[] = Array.isArray(parsed) ? parsed : parsed.trades;

      if (Array.isArray(trades)) {
        const validTrades = trades.filter(trade => 
          REQUIRED_FIELDS.every(field => trade.hasOwnProperty(field))
        );
        setPreview(validTrades);
        if (validTrades.length < trades.length) {
          setError(`${trades.length - validTrades.length} trade(s) con campos faltantes`);
        }
        return;
      }
    } catch {
      // Not JSON, try tabular format
    }

    // Parse as tabular data (TSV/CSV)
    const trades = parseTabularData(input);
    
    if (trades.length === 0) {
      setError("No se encontraron trades válidos. Verifica el formato de los datos.");
      return;
    }

    setPreview(trades);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setTextInput(text);
      parseInput(text);
    } catch {
      toast.error("No se pudo acceder al portapapeles");
    }
  };

  const handleImport = () => {
    if (preview.length === 0) {
      toast.error("No hay trades válidos para importar");
      return;
    }

    onImport(preview);
    toast.success(`${preview.length} trade(s) importado(s) correctamente`);
    setTextInput("");
    setPreview([]);
    setError(null);
    setOpen(false);
  };

  const handleClear = () => {
    setTextInput("");
    setPreview([]);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-primary hover:bg-primary/80">
          <Plus className="h-4 w-4" />
          Importar Trades
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <ClipboardPaste className="h-5 w-5 text-primary" />
            Importar Operaciones
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-sm">
                  <p className="text-xs">
                    Copia datos desde Excel, Google Sheets o cualquier tabla. 
                    El orden de columnas debe ser: id, fecha_entrada, fecha_salida, 
                    instrumento, moneda, direccion, stake_usd, resultado_usd, 
                    saldo_antes, saldo_despues, ...
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePaste}
              className="gap-2 flex-1 border-border hover:bg-muted"
            >
              <ClipboardPaste className="h-4 w-4" />
              Pegar desde Portapapeles
            </Button>
            {textInput && (
              <Button
                variant="ghost"
                onClick={handleClear}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
                Limpiar
              </Button>
            )}
          </div>

          <Textarea
            value={textInput}
            onChange={(e) => {
              setTextInput(e.target.value);
              parseInput(e.target.value);
            }}
            placeholder={`Pega aquí tus datos copiados desde Excel o Google Sheets.

Formato esperado (separado por tabulaciones o comas):
id	fecha_entrada	fecha_salida	instrumento	moneda	direccion	stake_usd	resultado_usd	saldo_antes	saldo_despues	...

Ejemplo:
123456	2026-01-20T16:00:00Z	2026-01-20T16:30:00Z	Boom 1000	USD	Venta	1000	200	10000	10200	...

También acepta formato JSON.`}
            className="h-48 font-mono text-sm bg-background border-border resize-none"
          />

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-loss/10 border border-loss/20 text-loss">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {preview.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-profit">
                <Check className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {preview.length} trade(s) válido(s) listo(s) para importar
                </span>
              </div>
              <div className="max-h-32 overflow-y-auto rounded-lg border border-border bg-background p-2 space-y-1">
                {preview.map((trade) => (
                  <div
                    key={trade.id}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/50"
                  >
                    <span className="font-mono text-muted-foreground">
                      #{trade.id.slice(-6)}
                    </span>
                    <span>{trade.instrumento}</span>
                    <span
                      className={
                        trade.resultado_usd >= 0 ? "text-profit" : "text-loss"
                      }
                    >
                      {trade.resultado_usd >= 0 ? "+" : ""}$
                      {trade.resultado_usd.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-border"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={preview.length === 0}
              className="gap-2 bg-profit hover:bg-profit/80 text-profit-foreground"
            >
              <Check className="h-4 w-4" />
              Importar {preview.length > 0 && `(${preview.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
