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

// Expected columns from Deriv format
const DERIV_HEADERS = ["type", "ref. id", "currency", "buy time", "stake", "sell time", "contract value", "total profit/loss"];

export function ImportTrades({ onImport }: ImportTradesProps) {
  const [open, setOpen] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Trade[]>([]);

  const detectDelimiter = (text: string): string => {
    const firstLine = text.split("\n")[0];
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;

    if (tabCount >= commaCount && tabCount >= semicolonCount) return "\t";
    if (semicolonCount >= commaCount) return ";";
    return ",";
  };

  const parseNumber = (value: string): number => {
    if (!value || value.trim() === "") return 0;
    // Remove +/- prefix, commas, and handle decimal
    const cleaned = value.replace(/[+,]/g, "").trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const parseDerivDate = (dateStr: string): string => {
    if (!dateStr || dateStr.trim() === "") return new Date().toISOString();
    
    try {
      // Handle format: "21 Jan 2026 14:46:51 GMT"
      const date = new Date(dateStr.trim());
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch {
      // Fall through to default
    }
    
    return new Date().toISOString();
  };

  const isHeaderRow = (cells: string[]): boolean => {
    const normalizedCells = cells.map(c => c.toLowerCase().trim());
    return normalizedCells.some(cell => 
      DERIV_HEADERS.includes(cell) || 
      cell.includes("ref") || 
      cell.includes("stake") ||
      cell.includes("profit")
    );
  };

  const parseVerticalFormat = (lines: string[]): Trade[] => {
    // Deriv vertical format: each field on its own line
    // Pattern: Type, Ref. ID, Currency, Buy time, Stake, Sell time, Contract value, Total profit/loss
    const FIELDS_PER_TRADE = 8;
    const trades: Trade[] = [];
    
    // Remove header lines if present
    let dataLines = [...lines];
    const firstLine = dataLines[0]?.toLowerCase().trim();
    if (firstLine === "type" || firstLine.includes("ref")) {
      // Skip header block (8 lines)
      dataLines = dataLines.slice(FIELDS_PER_TRADE);
    }

    // Process trades in chunks of 8 fields
    for (let i = 0; i + FIELDS_PER_TRADE <= dataLines.length; i += FIELDS_PER_TRADE) {
      const chunk = dataLines.slice(i, i + FIELDS_PER_TRADE).map(l => l.trim());
      
      const [type, refId, currency, buyTime, stake, sellTime, , profitLoss] = chunk;
      
      const stakeNum = parseNumber(stake);
      const resultadoUsd = parseNumber(profitLoss);

      if (refId && stakeNum > 0) {
        trades.push({
          refId,
          type,
          currency,
          buyTime,
          sellTime,
          stake: stakeNum,
          resultado: resultadoUsd,
        } as any);
      }
    }

    return trades;
  };

  const parseTabularData = (input: string): Trade[] => {
    const lines = input.trim().split("\n").filter(line => line.trim());
    if (lines.length === 0) return [];

    const delimiter = detectDelimiter(input);
    const firstLineCells = lines[0].split(delimiter).map(c => c.trim());
    
    // Check if it's vertical format (one field per line)
    // If first line has only one cell and it looks like a type/header
    const isVerticalFormat = firstLineCells.length === 1 && 
      (firstLineCells[0].toLowerCase() === "type" || 
       firstLineCells[0].match(/^x\d+$/i) ||
       lines.length >= 8);

    let parsedData: Array<{
      refId: string;
      type: string;
      currency: string;
      buyTime: string;
      sellTime: string;
      stake: number;
      resultado: number;
    }> = [];

    if (isVerticalFormat) {
      // Parse vertical format
      const FIELDS_PER_TRADE = 8;
      let dataLines = [...lines];
      
      // Check if first block is headers
      const firstField = dataLines[0]?.toLowerCase().trim();
      if (firstField === "type") {
        dataLines = dataLines.slice(FIELDS_PER_TRADE);
      }

      for (let i = 0; i + FIELDS_PER_TRADE <= dataLines.length; i += FIELDS_PER_TRADE) {
        const chunk = dataLines.slice(i, i + FIELDS_PER_TRADE).map(l => l.trim());
        const [type, refId, currency, buyTime, stake, sellTime, , profitLoss] = chunk;
        
        const stakeNum = parseNumber(stake);
        const resultadoUsd = parseNumber(profitLoss);

        if (refId && stakeNum > 0) {
          parsedData.push({
            refId,
            type,
            currency,
            buyTime,
            sellTime,
            stake: stakeNum,
            resultado: resultadoUsd,
          });
        }
      }
    } else {
      // Parse horizontal/tabular format
      const hasHeader = isHeaderRow(firstLineCells);
      const dataLines = hasHeader ? lines.slice(1) : lines;

      for (const line of dataLines) {
        const cells = line.split(delimiter).map(cell => cell.trim());
        
        if (cells.length < 8) continue;

        const [type, refId, currency, buyTime, stake, sellTime, , profitLoss] = cells;

        const stakeNum = parseNumber(stake);
        const resultadoUsd = parseNumber(profitLoss);

        if (refId && stakeNum > 0) {
          parsedData.push({
            refId,
            type,
            currency,
            buyTime,
            sellTime,
            stake: stakeNum,
            resultado: resultadoUsd,
          });
        }
      }
    }

    if (parsedData.length === 0) return [];

    // Sort by buy time (oldest first)
    parsedData.sort((a, b) => 
      new Date(parseDerivDate(a.buyTime)).getTime() - new Date(parseDerivDate(b.buyTime)).getTime()
    );

    // Create trades with running balance
    let runningBalance = parsedData[0].stake * 2;
    const trades: Trade[] = [];

    for (const data of parsedData) {
      const saldoAntes = runningBalance;
      const saldoDespues = runningBalance + data.resultado;
      runningBalance = saldoDespues;

      trades.push({
        id: data.refId,
        fecha_entrada: parseDerivDate(data.buyTime),
        fecha_salida: parseDerivDate(data.sellTime),
        instrumento: data.type || "Unknown",
        moneda: data.currency || "USD",
        direccion: "Compra",
        stake_usd: data.stake,
        resultado_usd: data.resultado,
        saldo_antes: saldoAntes,
        saldo_despues: saldoDespues,
        riesgo_pct_cuenta: saldoAntes > 0 ? (data.stake / saldoAntes) * 100 : 0,
        resultado_pct_cuenta: saldoAntes > 0 ? (data.resultado / saldoAntes) * 100 : 0,
        tf_principal: "",
        contexto_1h: "",
        posicion_en_canal: "",
        tipo_setup: "",
        entrada_por: "",
        stop_plan_usd: 0,
        tp_plan_usd: 0,
        motivo_salida: "",
        notas: "",
      });
    }

    return trades;
  };

  const parseInput = (input: string) => {
    setError(null);
    setPreview([]);

    if (!input.trim()) return;

    // Try JSON first (backwards compatibility)
    try {
      const parsed = JSON.parse(input);
      const trades: any[] = Array.isArray(parsed) ? parsed : parsed.trades;

      if (Array.isArray(trades) && trades.length > 0) {
        setPreview(trades);
        return;
      }
    } catch {
      // Not JSON, continue to tabular parsing
    }

    // Parse as tabular data (Deriv format)
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
                    Copia datos directamente desde tu historial de Deriv.
                    Formato: Type, Ref. ID, Currency, Buy time, Stake, Sell time, Contract value, Total profit/loss
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
            placeholder={`Pega aquí tus trades copiados desde Deriv.

Formato esperado:
Type	Ref. ID	Currency	Buy time	Stake	Sell time	Contract value	Total profit/loss
x300	606136916768	USD	21 Jan 2026 14:46:51 GMT	1,000.00	21 Jan 2026 14:51:35 GMT	1,269.04	+269.04`}
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
