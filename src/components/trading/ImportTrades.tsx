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
import { ClipboardPaste, Plus, Check, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";

interface ImportTradesProps {
  onImport: (trades: Trade[]) => void;
}

export function ImportTrades({ onImport }: ImportTradesProps) {
  const [open, setOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Trade[]>([]);

  const validateTrade = (trade: any): trade is Trade => {
    const requiredFields = [
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

    return requiredFields.every((field) => trade.hasOwnProperty(field));
  };

  const parseInput = (input: string) => {
    setError(null);
    setPreview([]);

    if (!input.trim()) return;

    try {
      let parsed = JSON.parse(input);

      // Handle both { trades: [...] } and [...] formats
      let trades: any[] = Array.isArray(parsed) ? parsed : parsed.trades;

      if (!Array.isArray(trades)) {
        throw new Error("El JSON debe contener un array de trades");
      }

      const validTrades: Trade[] = [];
      const invalidIndexes: number[] = [];

      trades.forEach((trade, index) => {
        if (validateTrade(trade)) {
          validTrades.push(trade);
        } else {
          invalidIndexes.push(index + 1);
        }
      });

      if (invalidIndexes.length > 0) {
        setError(
          `Trades con formato inválido: ${invalidIndexes.join(", ")}. Verifica los campos requeridos.`
        );
      }

      setPreview(validTrades);
    } catch (e) {
      if (e instanceof SyntaxError) {
        setError("JSON inválido. Verifica la sintaxis.");
      } else if (e instanceof Error) {
        setError(e.message);
      }
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setJsonInput(text);
      parseInput(text);
    } catch (e) {
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
    setJsonInput("");
    setPreview([]);
    setError(null);
    setOpen(false);
  };

  const handleClear = () => {
    setJsonInput("");
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
            {jsonInput && (
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
            value={jsonInput}
            onChange={(e) => {
              setJsonInput(e.target.value);
              parseInput(e.target.value);
            }}
            placeholder={`Pega aquí tu JSON con el formato:
{
  "trades": [
    {
      "id": "123456",
      "fecha_entrada": "2026-01-20T16:00:00Z",
      "fecha_salida": "2026-01-20T16:30:00Z",
      "instrumento": "Boom 1000",
      "direccion": "Venta",
      "stake_usd": 1000,
      "resultado_usd": 200,
      "saldo_antes": 10000,
      "saldo_despues": 10200,
      ...
    }
  ]
}

También puedes pegar solo el array: [{ ... }, { ... }]`}
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
