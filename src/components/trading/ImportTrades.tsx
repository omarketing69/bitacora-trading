import { useState, useEffect } from "react";
import { Trade } from "@/types/trade";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ClipboardPaste, Plus, Check, AlertCircle, X, HelpCircle, DollarSign } from "lucide-react";
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
  const [initialBalance, setInitialBalance] = useState<string>("");

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

  const parseTabularData = (input: string): Trade[] => {
    const lines = input.trim().split("\n").filter(line => line.trim());
    if (lines.length === 0) return [];

    const delimiter = detectDelimiter(input);
    const firstLineCells = lines[0].split(delimiter).map(c => c.trim());
    
    // Check if it's vertical format (one field per line)
    // NOTE: some copy/pastes include extra blank/separator lines so we must NOT rely on lines%8 === 0
    const isVerticalFormat =
      firstLineCells.length === 1 &&
      (
        firstLineCells[0].toLowerCase() === "type" ||
        firstLineCells[0].match(/^x\d+$/i) ||
        // Check if second line looks like a Ref ID (numeric)
        (lines[1] && /^\d+$/.test(lines[1].trim())) ||
        // Or anywhere in the first ~30 lines (helps when the paste starts mid-block)
        lines.slice(0, 30).some((l) => /^\d+$/.test(l.trim()))
      );

    console.log(`[ImportTrades] Format detection: vertical=${isVerticalFormat}, lines=${lines.length}, firstCells=${firstLineCells.length}`);

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
      // Parse vertical format (robust): scan by Ref ID markers instead of fixed chunks
      let dataLines = [...lines].map((l) => l.trim()).filter(Boolean);

      const isHeaderWord = (v: string) => {
        const t = v.toLowerCase().trim();
        return (
          t === "type" ||
          t === "tipo" ||
          t === "ref. id" ||
          t === "ref id" ||
          t === "currency" ||
          t === "buy time" ||
          t === "sell time" ||
          t === "stake" ||
          t === "contract value" ||
          t.includes("profit")
        );
      };

      const looksLikeDate = (v: string) => {
        const t = v.trim();
        // quick heuristic for Deriv strings like: 21 Jan 2026 14:46:51 GMT
        return /\b\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\b/.test(t) || t.includes("GMT");
      };

      const looksLikeNumber = (v: string) => /[-+]?\d/.test(v);

      const looksLikeCurrency = (v: string) => /^[A-Z]{3}$/.test(v.trim());

      const isRefId = (v: string) => /^\d{6,}$/.test(v.trim());

      const looksLikeType = (v: string) => {
        const t = v.trim();
        // Deriv often uses x300 / x400 / x500 etc. in these exports
        return /^x\d+$/i.test(t);
      };

      const findInRange = (arr: string[], start: number, end: number, predicate: (v: string) => boolean) => {
        const s = Math.max(0, start);
        const e = Math.min(arr.length - 1, end);
        for (let idx = s; idx <= e; idx++) {
          if (predicate(arr[idx])) return { idx, value: arr[idx] };
        }
        return null;
      };

      console.log(`[ImportTrades] Processing ${dataLines.length} data lines (refId-scan mode)`);

      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i];
        if (isHeaderWord(line)) continue;

        // Ref ID line is numeric
        if (!isRefId(line)) continue;

        const refId = line;

        // Find type nearby (best effort): look a few lines back for x###
        const typeHit = findInRange(dataLines, i - 4, i - 1, (v) => !isHeaderWord(v) && looksLikeType(v));
        const type = typeHit?.value ?? "";

        // Currency is often right after refId, but not always—search next few lines.
        const currencyHit = findInRange(dataLines, i + 1, i + 4, (v) => !isHeaderWord(v) && looksLikeCurrency(v));
        const currency = currencyHit?.value ?? "";

        // Buy time: first date after refId within next ~10 lines
        const buyHit = findInRange(dataLines, i + 1, i + 12, (v) => !isHeaderWord(v) && looksLikeDate(v));
        if (!buyHit) continue;
        const buyTime = buyHit.value;

        // Stake: first numeric after buy time, avoiding refIds
        const stakeHit = findInRange(
          dataLines,
          buyHit.idx + 1,
          buyHit.idx + 8,
          (v) => !isHeaderWord(v) && looksLikeNumber(v) && !isRefId(v)
        );
        if (!stakeHit) continue;
        const stakeRaw = stakeHit.value;
        const stakeNum = parseNumber(stakeRaw);

        // Sell time: next date after stake
        const sellHit = findInRange(dataLines, stakeHit.idx + 1, stakeHit.idx + 10, (v) => !isHeaderWord(v) && looksLikeDate(v));
        if (!sellHit) continue;
        const sellTime = sellHit.value;

        // Profit/Loss: first numeric after sell time, avoiding refIds.
        // (Contract value may appear first; we accept the last numeric within the next few lines as P/L)
        const pnlCandidates: Array<{ idx: number; value: string }> = [];
        for (let j = sellHit.idx + 1; j <= Math.min(dataLines.length - 1, sellHit.idx + 10); j++) {
          const v = dataLines[j];
          if (isHeaderWord(v) || isRefId(v)) continue;
          if (looksLikeNumber(v)) pnlCandidates.push({ idx: j, value: v });
          // Stop early if we hit next type/refId-ish block markers
          if (looksLikeType(v) && pnlCandidates.length > 0) break;
        }
        if (pnlCandidates.length === 0) continue;
        const pnlHit = pnlCandidates[pnlCandidates.length - 1];
        const profitLossRaw = pnlHit.value;
        const resultadoUsd = parseNumber(profitLossRaw);

        console.log(
          `[ImportTrades] Parsing trade(ref-scan): refId=${refId}, type=${type}, stake=${stakeNum}, result=${resultadoUsd}`
        );

        parsedData.push({
          refId,
          type,
          currency,
          buyTime,
          sellTime,
          stake: stakeNum,
          resultado: resultadoUsd,
        });

        // Skip ahead to just after P/L to reduce double-detections
        i = Math.max(i, pnlHit.idx);
      }
    } else {
      // Parse horizontal/tabular format
      const hasHeader = isHeaderRow(firstLineCells);
      const dataLines = hasHeader ? lines.slice(1) : lines;

      console.log(`[ImportTrades] Parsing tabular format: ${dataLines.length} lines, hasHeader=${hasHeader}`);

      for (const line of dataLines) {
        const cells = line.split(delimiter).map(cell => cell.trim());
        
        // Allow rows with at least 7 cells (some exports may have trailing empty cells)
        if (cells.length < 7) {
          console.log(`[ImportTrades] Skipping line with ${cells.length} cells: ${line.substring(0, 50)}...`);
          continue;
        }

        const [type, refId, currency, buyTime, stake, sellTime, contractValue, profitLoss] = cells;

        const stakeNum = parseNumber(stake);
        const resultadoUsd = parseNumber(profitLoss || "0");

        console.log(`[ImportTrades] Row: refId=${refId}, stake=${stakeNum}, result=${resultadoUsd}`);

        // Accept if refId looks valid
        if (refId && refId.match(/^\d+$/)) {
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

    if (parsedData.length === 0) {
      console.log(`[ImportTrades] No trades parsed from input`);
      return [];
    }

    // Sort by buy time (oldest first)
    parsedData.sort((a, b) => 
      new Date(parseDerivDate(a.buyTime)).getTime() - new Date(parseDerivDate(b.buyTime)).getTime()
    );

    // Create trades with running balance
    // Use initial balance if provided, otherwise estimate from first stake
    const startingBalance = initialBalance && parseFloat(initialBalance) > 0 
      ? parseFloat(initialBalance) 
      : parsedData[0].stake * 2;
    let runningBalance = startingBalance;
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

  // Re-parse when initial balance changes
  useEffect(() => {
    if (textInput.trim()) {
      parseInput(textInput);
    }
  }, [initialBalance]);

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
    setInitialBalance("");
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
          {/* Initial Balance Input */}
          <div className="space-y-2">
            <Label htmlFor="initialBalance" className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="h-4 w-4 text-primary" />
              Saldo Inicial (opcional)
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="text-xs">
                      Ingresa el saldo de tu cuenta antes del primer trade. 
                      Si no lo especificas, se estimará automáticamente.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="initialBalance"
                type="number"
                min="0"
                step="0.01"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                placeholder="Ej: 5000.00"
                className="pl-7 bg-background border-border"
              />
            </div>
          </div>

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
