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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type PlatformType = "deriv" | "mt5" | "binance";

// Expected columns from Deriv format
const DERIV_HEADERS = ["type", "ref. id", "currency", "buy time", "stake", "sell time", "contract value", "total profit/loss"];

// Expected columns from MT5 format
const MT5_HEADERS = ["time", "type", "order", "symbol", "volume", "price", "s/l", "t/p", "profit", "balance"];

// Expected columns from Binance format (Trade History export)
const BINANCE_HEADERS = ["date(utc)", "pair", "side", "price", "executed", "amount", "fee", "total"];

export function ImportTrades({ onImport }: ImportTradesProps) {
  const [open, setOpen] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Trade[]>([]);
  const [initialBalance, setInitialBalance] = useState<string>("");
  const [platform, setPlatform] = useState<PlatformType>("deriv");

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
      MT5_HEADERS.includes(cell) ||
      BINANCE_HEADERS.includes(cell) ||
      cell.includes("ref") || 
      cell.includes("stake") ||
      cell.includes("profit") ||
      cell.includes("symbol") ||
      cell.includes("order") ||
      cell.includes("pair") ||
      cell.includes("executed")
    );
  };

  // Parse Binance Trade History format
  const parseBinanceData = (input: string): Trade[] => {
    const lines = input.trim().split("\n").filter(line => line.trim());
    if (lines.length === 0) return [];

    const delimiter = detectDelimiter(input);
    
    console.log(`[ImportTrades] Binance parsing: ${lines.length} lines, delimiter="${delimiter === '\t' ? 'TAB' : delimiter}"`);

    let parsedData: Array<{
      date: string;
      pair: string;
      side: string;
      price: number;
      executed: number;
      amount: number;
      fee: number;
      total: number;
    }> = [];

    // Find header row to detect column indices
    let headerIndex = -1;
    let columnMap: { [key: string]: number } = {};

    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const cells = lines[i].split(delimiter).map(c => c.trim().toLowerCase());
      const hasDate = cells.some(c => c.includes("date") || c.includes("time"));
      const hasPair = cells.some(c => c === "pair" || c === "market" || c === "symbol");
      const hasSide = cells.some(c => c === "side" || c === "type");
      
      if (hasDate && (hasPair || hasSide)) {
        headerIndex = i;
        cells.forEach((cell, idx) => {
          columnMap[cell] = idx;
        });
        console.log(`[ImportTrades] Binance header found at line ${i}:`, columnMap);
        break;
      }
    }

    // If no header found, try common Binance column order
    if (headerIndex === -1) {
      console.log(`[ImportTrades] No Binance header found, using default column order`);
      // Common Binance export: Date(UTC), Pair, Side, Price, Executed, Amount, Fee
      columnMap = {
        "date(utc)": 0,
        "pair": 1,
        "side": 2,
        "price": 3,
        "executed": 4,
        "amount": 5,
        "fee": 6,
        "total": 7
      };
    }

    const dataLines = headerIndex >= 0 ? lines.slice(headerIndex + 1) : lines;
    
    // Get column indices with fallbacks
    const dateCol = columnMap["date(utc)"] ?? columnMap["date"] ?? columnMap["time"] ?? 0;
    const pairCol = columnMap["pair"] ?? columnMap["market"] ?? columnMap["symbol"] ?? 1;
    const sideCol = columnMap["side"] ?? columnMap["type"] ?? 2;
    const priceCol = columnMap["price"] ?? 3;
    const executedCol = columnMap["executed"] ?? columnMap["filled"] ?? columnMap["qty"] ?? 4;
    const amountCol = columnMap["amount"] ?? columnMap["total"] ?? 5;
    const feeCol = columnMap["fee"] ?? 6;

    for (const line of dataLines) {
      const cells = line.split(delimiter).map(c => c.trim());
      
      if (cells.length < 4) {
        console.log(`[ImportTrades] Binance skipping line with ${cells.length} cells`);
        continue;
      }

      const date = cells[dateCol] || "";
      const pair = cells[pairCol] || "";
      const side = cells[sideCol] || "";
      const price = parseNumber(cells[priceCol] || "0");
      const executed = parseNumber(cells[executedCol] || "0");
      const amount = parseNumber(cells[amountCol] || "0");
      const fee = parseNumber(cells[feeCol] || "0");

      // Skip if no pair or invalid data
      if (!pair || (!price && !amount)) {
        console.log(`[ImportTrades] Binance skipping: pair=${pair}, price=${price}, amount=${amount}`);
        continue;
      }

      console.log(`[ImportTrades] Binance trade: pair=${pair}, side=${side}, amount=${amount}, price=${price}`);

      parsedData.push({
        date,
        pair,
        side,
        price,
        executed,
        amount: amount || (executed * price),
        fee,
        total: amount - fee
      });
    }

    if (parsedData.length === 0) {
      console.log(`[ImportTrades] No Binance trades parsed`);
      return [];
    }

    // Sort by date
    parsedData.sort((a, b) => {
      const dateA = parseBinanceDate(a.date);
      const dateB = parseBinanceDate(b.date);
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

    // Create trades with running balance
    const startingBalance = initialBalance && parseFloat(initialBalance) > 0 
      ? parseFloat(initialBalance) 
      : 1000; // Default for Binance since we don't have balance info
    
    let runningBalance = startingBalance;
    const trades: Trade[] = [];

    for (let i = 0; i < parsedData.length; i++) {
      const data = parsedData[i];
      const saldoAntes = runningBalance;
      
      // For Binance, calculate P&L based on buy/sell pairs or estimate
      // Since individual trades don't have P&L, we'll use a simplified approach
      const isBuy = data.side.toLowerCase().includes("buy") || data.side.toLowerCase().includes("compra");
      
      // Calculate simple P&L estimate based on fee (actual P&L requires matching trades)
      const estimatedPnL = -data.fee; // Fee is the minimum known cost
      
      const saldoDespues = runningBalance + estimatedPnL;
      runningBalance = saldoDespues;

      // Determine direction
      const direccion: "Compra" | "Venta" = isBuy ? "Compra" : "Venta";

      trades.push({
        id: `binance_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        fecha_entrada: parseBinanceDate(data.date),
        fecha_salida: parseBinanceDate(data.date),
        instrumento: data.pair,
        moneda: "USDT",
        direccion,
        stake_usd: data.amount,
        resultado_usd: estimatedPnL,
        saldo_antes: saldoAntes,
        saldo_despues: saldoDespues,
        riesgo_pct_cuenta: saldoAntes > 0 ? (data.amount / saldoAntes) * 100 : 0,
        resultado_pct_cuenta: saldoAntes > 0 ? (estimatedPnL / saldoAntes) * 100 : 0,
        tf_principal: "",
        contexto_1h: "",
        posicion_en_canal: "",
        tipo_setup: "",
        entrada_por: "",
        stop_plan_usd: 0,
        tp_plan_usd: 0,
        motivo_salida: "",
        notas: `Price: ${data.price}, Qty: ${data.executed}, Fee: ${data.fee}`,
      });
    }

    return trades;
  };

  const parseBinanceDate = (dateStr: string): string => {
    if (!dateStr || dateStr.trim() === "") return new Date().toISOString();
    
    try {
      // Handle Binance format: "2024-01-20 10:30:00" or "2024/01/20 10:30"
      const cleaned = dateStr.trim().replace(/\//g, "-");
      const date = new Date(cleaned);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch {
      // Fall through to default
    }
    
    return new Date().toISOString();
  };

  // Parse MT5 Account History format
  const parseMT5Data = (input: string): Trade[] => {
    const lines = input.trim().split("\n").filter(line => line.trim());
    if (lines.length === 0) return [];

    const delimiter = detectDelimiter(input);
    
    console.log(`[ImportTrades] MT5 parsing: ${lines.length} lines, delimiter="${delimiter === '\t' ? 'TAB' : delimiter}"`);

    let parsedData: Array<{
      order: string;
      symbol: string;
      type: string;
      volume: number;
      price: number;
      profit: number;
      time: string;
      balance: number;
    }> = [];

    // Find header row to detect column indices
    let headerIndex = -1;
    let columnMap: { [key: string]: number } = {};

    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const cells = lines[i].split(delimiter).map(c => c.trim().toLowerCase());
      const hasTime = cells.some(c => c === "time" || c === "fecha" || c === "hora");
      const hasSymbol = cells.some(c => c === "symbol" || c === "símbolo");
      const hasProfit = cells.some(c => c === "profit" || c === "beneficio" || c === "ganancia");
      
      if ((hasTime && hasSymbol) || (hasSymbol && hasProfit)) {
        headerIndex = i;
        cells.forEach((cell, idx) => {
          columnMap[cell] = idx;
        });
        console.log(`[ImportTrades] MT5 header found at line ${i}:`, columnMap);
        break;
      }
    }

    // If no header found, try common MT5 column order
    if (headerIndex === -1) {
      console.log(`[ImportTrades] No MT5 header found, using default column order`);
      // Default MT5 order: Time, Type, Order, Symbol, Volume, Price, S/L, T/P, Profit, Balance
      columnMap = {
        "time": 0,
        "type": 1,
        "order": 2,
        "symbol": 3,
        "volume": 4,
        "price": 5,
        "s/l": 6,
        "t/p": 7,
        "profit": 8,
        "balance": 9
      };
    }

    const dataLines = headerIndex >= 0 ? lines.slice(headerIndex + 1) : lines;
    
    // Get column indices with fallbacks
    const timeCol = columnMap["time"] ?? columnMap["fecha"] ?? 0;
    const typeCol = columnMap["type"] ?? columnMap["tipo"] ?? 1;
    const orderCol = columnMap["order"] ?? columnMap["orden"] ?? 2;
    const symbolCol = columnMap["symbol"] ?? columnMap["símbolo"] ?? 3;
    const volumeCol = columnMap["volume"] ?? columnMap["volumen"] ?? 4;
    const priceCol = columnMap["price"] ?? columnMap["precio"] ?? 5;
    const profitCol = columnMap["profit"] ?? columnMap["beneficio"] ?? columnMap["ganancia"] ?? 8;
    const balanceCol = columnMap["balance"] ?? columnMap["saldo"] ?? 9;

    for (const line of dataLines) {
      const cells = line.split(delimiter).map(c => c.trim());
      
      if (cells.length < 5) {
        console.log(`[ImportTrades] MT5 skipping line with ${cells.length} cells`);
        continue;
      }

      const time = cells[timeCol] || "";
      const type = cells[typeCol] || "";
      const order = cells[orderCol] || "";
      const symbol = cells[symbolCol] || "";
      const volume = parseNumber(cells[volumeCol] || "0");
      const price = parseNumber(cells[priceCol] || "0");
      const profit = parseNumber(cells[profitCol] || "0");
      const balance = parseNumber(cells[balanceCol] || "0");

      // Filter: only include actual trades (buy/sell), skip deposits/withdrawals/balance operations
      const typeNorm = type.toLowerCase();
      const isTrade = typeNorm.includes("buy") || typeNorm.includes("sell") || 
                      typeNorm.includes("compra") || typeNorm.includes("venta");
      
      // Skip if no symbol or looks like a non-trade entry
      if (!symbol || symbol.toLowerCase() === "balance" || !isTrade) {
        console.log(`[ImportTrades] MT5 skipping non-trade: type=${type}, symbol=${symbol}`);
        continue;
      }

      console.log(`[ImportTrades] MT5 trade: order=${order}, symbol=${symbol}, profit=${profit}`);

      parsedData.push({
        order: order || `mt5_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        symbol,
        type,
        volume,
        price,
        profit,
        time,
        balance
      });
    }

    if (parsedData.length === 0) {
      console.log(`[ImportTrades] No MT5 trades parsed`);
      return [];
    }

    // Sort by time
    parsedData.sort((a, b) => {
      const dateA = parseMT5Date(a.time);
      const dateB = parseMT5Date(b.time);
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

    // Create trades with running balance
    const startingBalance = initialBalance && parseFloat(initialBalance) > 0 
      ? parseFloat(initialBalance) 
      : (parsedData[0].balance > 0 ? parsedData[0].balance - parsedData[0].profit : 1000);
    
    let runningBalance = startingBalance;
    const trades: Trade[] = [];

    for (const data of parsedData) {
      const saldoAntes = runningBalance;
      const saldoDespues = runningBalance + data.profit;
      runningBalance = saldoDespues;

      // Determine direction
      const typeNorm = data.type.toLowerCase();
      const direccion: "Compra" | "Venta" = 
        typeNorm.includes("buy") || typeNorm.includes("compra") ? "Compra" : "Venta";

      trades.push({
        id: data.order,
        fecha_entrada: parseMT5Date(data.time),
        fecha_salida: parseMT5Date(data.time), // MT5 history shows close time
        instrumento: data.symbol,
        moneda: "USD",
        direccion,
        stake_usd: data.volume * 100000 * 0.01, // Approximate lot value
        resultado_usd: data.profit,
        saldo_antes: saldoAntes,
        saldo_despues: saldoDespues,
        riesgo_pct_cuenta: 0,
        resultado_pct_cuenta: saldoAntes > 0 ? (data.profit / saldoAntes) * 100 : 0,
        tf_principal: "",
        contexto_1h: "",
        posicion_en_canal: "",
        tipo_setup: "",
        entrada_por: "",
        stop_plan_usd: 0,
        tp_plan_usd: 0,
        motivo_salida: "",
        notas: `Vol: ${data.volume}, Price: ${data.price}`,
      });
    }

    return trades;
  };

  const parseMT5Date = (dateStr: string): string => {
    if (!dateStr || dateStr.trim() === "") return new Date().toISOString();
    
    try {
      // Handle MT5 format: "2024.01.20 10:30:00" or "2024/01/20 10:30"
      const cleaned = dateStr.trim().replace(/\./g, "-").replace(/\//g, "-");
      const date = new Date(cleaned);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch {
      // Fall through to default
    }
    
    return new Date().toISOString();
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
      
      // P/L values typically start with + or - prefix
      const looksLikeProfitLoss = (v: string) => /^[+-]/.test(v.trim()) && /\d/.test(v);

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

        // Profit/Loss: search for values with +/- prefix (typical P/L format)
        // Contract value comes before P/L, so we prioritize +/- prefixed values
        const pnlCandidates: Array<{ idx: number; value: string; isPnL: boolean }> = [];
        for (let j = sellHit.idx + 1; j <= Math.min(dataLines.length - 1, sellHit.idx + 12); j++) {
          const v = dataLines[j];
          if (isHeaderWord(v) || isRefId(v)) continue;
          if (looksLikeNumber(v)) {
            pnlCandidates.push({ idx: j, value: v, isPnL: looksLikeProfitLoss(v) });
          }
          // Stop early if we hit next type/refId-ish block markers
          if (looksLikeType(v) && pnlCandidates.length > 0) break;
        }
        if (pnlCandidates.length === 0) continue;
        
        // Prefer values with +/- prefix (actual P/L), otherwise take the last numeric
        const pnlHit = pnlCandidates.find(c => c.isPnL) || pnlCandidates[pnlCandidates.length - 1];
        const profitLossRaw = pnlHit.value;
        const resultadoUsd = parseNumber(profitLossRaw);
        
        console.log(`[ImportTrades] P/L candidates for ${refId}:`, pnlCandidates.map(c => `${c.value}(isPnL:${c.isPnL})`).join(', '));

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

    // Parse based on selected platform
    let trades: Trade[];
    if (platform === "mt5") {
      trades = parseMT5Data(input);
    } else if (platform === "binance") {
      trades = parseBinanceData(input);
    } else {
      trades = parseTabularData(input);
    }
    
    const platformNames = { deriv: "Deriv", mt5: "MetaTrader 5", binance: "Binance" };
    if (trades.length === 0) {
      setError(`No se encontraron trades válidos para ${platformNames[platform]}. Verifica el formato.`);
      return;
    }

    setPreview(trades);
  };

  // Re-parse when initial balance or platform changes
  useEffect(() => {
    if (textInput.trim()) {
      parseInput(textInput);
    }
  }, [initialBalance, platform]);

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
        <Button size="sm" className="gap-1 bg-primary hover:bg-primary/80">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Importar Trades</span>
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
                    Copia datos directamente desde tu historial de operaciones.
                    Soporta Deriv/Binary, MetaTrader 5 y Binance.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Platform Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Plataforma</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as PlatformType)}>
              <SelectTrigger className="w-full bg-background border-border">
                <SelectValue placeholder="Selecciona plataforma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deriv">Deriv / Binary</SelectItem>
                <SelectItem value="mt5">MetaTrader 5</SelectItem>
                <SelectItem value="binance">Binance</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
            placeholder={platform === "mt5" 
              ? `Pega aquí tus trades copiados desde MetaTrader 5 (Account History).

Formato esperado:
Time	Type	Order	Symbol	Volume	Price	S/L	T/P	Profit	Balance
2024.01.20 10:30:00	buy	123456	EURUSD	0.10	1.08500	1.08000	1.09000	125.50	5125.50`
              : platform === "binance"
              ? `Pega aquí tus trades exportados desde Binance (Trade History).

Formato esperado:
Date(UTC)	Pair	Side	Price	Executed	Amount	Fee
2024-01-20 10:30:00	BTCUSDT	BUY	42500.00	0.001	42.50	0.0425`
              : `Pega aquí tus trades copiados desde Deriv.

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
