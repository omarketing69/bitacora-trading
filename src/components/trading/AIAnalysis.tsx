import { useState, useEffect, useMemo } from "react";
import { Trade } from "@/types/trade";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Brain, Shield, AlertTriangle, Loader2, Sparkles, Calendar, Filter, List, Bitcoin, DollarSign, TrendingUp, Zap } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";

interface AIAnalysisProps {
  trades: Trade[];
}

type AnalysisType = "risk" | "errors";
type FilterMode = "all" | "date" | "select";
type MarketType = "crypto" | "forex" | "sp500" | "synthetic";

const MARKET_OPTIONS: { value: MarketType; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    value: "crypto", 
    label: "Cripto", 
    icon: <Bitcoin className="h-4 w-4" />,
    description: "BTC, ETH, Altcoins"
  },
  { 
    value: "forex", 
    label: "Forex", 
    icon: <DollarSign className="h-4 w-4" />,
    description: "EUR/USD, GBP/USD"
  },
  { 
    value: "sp500", 
    label: "S&P 500", 
    icon: <TrendingUp className="h-4 w-4" />,
    description: "Índices USA"
  },
  { 
    value: "synthetic", 
    label: "Sintéticos", 
    icon: <Zap className="h-4 w-4" />,
    description: "Boom/Crash Deriv"
  },
];

export function AIAnalysis({ trades }: AIAnalysisProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AnalysisType>("risk");
  const [marketType, setMarketType] = useState<MarketType>("synthetic");
  const [riskAnalysis, setRiskAnalysis] = useState("");
  const [errorAnalysis, setErrorAnalysis] = useState("");
  const [isLoadingRisk, setIsLoadingRisk] = useState(false);
  const [isLoadingErrors, setIsLoadingErrors] = useState(false);
  
  // Filter state
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedTradeIds, setSelectedTradeIds] = useState<Set<string>>(new Set());

  // Get unique dates from trades for quick selection
  const uniqueDates = useMemo(() => {
    const dates = new Set<string>();
    trades.forEach((t) => {
      const date = t.fecha_entrada.split(" ")[0];
      dates.add(date);
    });
    return Array.from(dates).sort().reverse();
  }, [trades]);

  // Filter trades based on mode
  const filteredTrades = useMemo(() => {
    if (filterMode === "all") return trades;
    
    if (filterMode === "date" && dateFrom) {
      const from = startOfDay(parseISO(dateFrom));
      const to = dateTo ? endOfDay(parseISO(dateTo)) : endOfDay(parseISO(dateFrom));
      
      return trades.filter((t) => {
        const tradeDate = parseISO(t.fecha_entrada.split(" ")[0]);
        return isWithinInterval(tradeDate, { start: from, end: to });
      });
    }
    
    if (filterMode === "select") {
      return trades.filter((t) => selectedTradeIds.has(t.id));
    }
    
    return trades;
  }, [trades, filterMode, dateFrom, dateTo, selectedTradeIds]);

  const toggleTradeSelection = (id: string) => {
    setSelectedTradeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllTrades = () => {
    setSelectedTradeIds(new Set(trades.map((t) => t.id)));
  };

  const clearSelection = () => {
    setSelectedTradeIds(new Set());
  };

  const streamAnalysis = async (type: AnalysisType, currentTrades: Trade[], market: MarketType) => {
    if (currentTrades.length === 0) {
      toast.error("No hay trades para analizar");
      return;
    }

    const setLoading = type === "risk" ? setIsLoadingRisk : setIsLoadingErrors;
    const setAnalysis = type === "risk" ? setRiskAnalysis : setErrorAnalysis;

    setLoading(true);
    setAnalysis("");

    console.log(`[AIAnalysis] Sending ${currentTrades.length} trades for ${type} analysis, market: ${market}`);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-trades`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            trades: currentTrades, 
            analysisType: type,
            marketType: market 
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al analizar trades");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              setAnalysis(fullContent);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error(error instanceof Error ? error.message : "Error al analizar");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as AnalysisType);
  };

  const handleAnalyze = () => {
    streamAnalysis(activeTab, filteredTrades, marketType);
  };

  const currentAnalysis = activeTab === "risk" ? riskAnalysis : errorAnalysis;
  const isLoading = activeTab === "risk" ? isLoadingRisk : isLoadingErrors;
  const selectedMarket = MARKET_OPTIONS.find(m => m.value === marketType);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setRiskAnalysis("");
      setErrorAnalysis("");
      setFilterMode("all");
      setDateFrom("");
      setDateTo("");
      setSelectedTradeIds(new Set());
      console.log(`[AIAnalysis] Dialog opened with ${trades.length} trades`);
    }
  }, [open, trades.length]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={trades.length === 0}
        >
          <Brain className="h-4 w-4" />
          <span className="hidden sm:inline">Análisis IA</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Análisis con Inteligencia Artificial
          </DialogTitle>
        </DialogHeader>

        {/* Market Type Selector */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Zap className="h-4 w-4 text-primary" />
            Tipo de Mercado
          </div>
          <ToggleGroup 
            type="single" 
            value={marketType} 
            onValueChange={(value) => value && setMarketType(value as MarketType)}
            className="grid grid-cols-2 sm:grid-cols-4 gap-2"
          >
            {MARKET_OPTIONS.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                className="flex flex-col items-center gap-1 py-3 px-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {option.icon}
                <span className="text-xs font-medium">{option.label}</span>
                <span className="text-[10px] opacity-70 hidden sm:block">{option.description}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {selectedMarket && (
            <p className="text-xs text-muted-foreground">
              El análisis estará especializado en {selectedMarket.label}: {selectedMarket.description}
            </p>
          )}
        </div>

        {/* Filter Section */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Filter className="h-4 w-4" />
            Filtrar Trades para Análisis
          </div>
          
          <div className="flex flex-wrap gap-4">
            <Select value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Modo de filtro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    Todos ({trades.length})
                  </div>
                </SelectItem>
                <SelectItem value="date">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Por Fecha
                  </div>
                </SelectItem>
                <SelectItem value="select">
                  <div className="flex items-center gap-2">
                    <Checkbox className="h-4 w-4" />
                    Selección Manual
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {filterMode === "date" && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="dateFrom" className="text-xs whitespace-nowrap">Desde:</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-[150px] h-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="dateTo" className="text-xs whitespace-nowrap">Hasta:</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-[150px] h-9"
                  />
                </div>
                {uniqueDates.length > 0 && (
                  <Select onValueChange={(v) => { setDateFrom(v); setDateTo(v); }}>
                    <SelectTrigger className="w-[140px] h-9">
                      <SelectValue placeholder="Día rápido" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueDates.slice(0, 10).map((date) => (
                        <SelectItem key={date} value={date}>
                          {format(parseISO(date), "dd/MM/yyyy")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>

          {filterMode === "select" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={selectAllTrades}>
                  Seleccionar todos
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Limpiar
                </Button>
                <span className="text-sm text-muted-foreground ml-2">
                  {selectedTradeIds.size} seleccionados
                </span>
              </div>
              <ScrollArea className="h-[150px] rounded border border-border p-2">
                <div className="space-y-1">
                  {trades.map((trade) => (
                    <div
                      key={trade.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleTradeSelection(trade.id)}
                    >
                      <Checkbox checked={selectedTradeIds.has(trade.id)} />
                      <span className="text-xs font-mono">{trade.fecha_entrada}</span>
                      <span className="text-xs">{trade.instrumento}</span>
                      <span className={`text-xs ml-auto ${trade.resultado_usd >= 0 ? "text-green-500" : "text-red-500"}`}>
                        ${trade.resultado_usd.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            {filteredTrades.length} trades seleccionados para el análisis
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="risk" className="gap-2">
              <Shield className="h-4 w-4" />
              Gestión de Riesgo
            </TabsTrigger>
            <TabsTrigger value="errors" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Análisis de Errores
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {activeTab === "risk"
                  ? `Analiza tu gestión de riesgo para ${selectedMarket?.label}`
                  : `Identifica errores típicos de ${selectedMarket?.label}`}
              </p>
              <Button
                onClick={handleAnalyze}
                disabled={isLoading || filteredTrades.length === 0}
                size="sm"
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4" />
                    Analizar {filteredTrades.length} trades
                  </>
                )}
              </Button>
            </div>

            <TabsContent value="risk" className="mt-0">
              <ScrollArea className="h-[300px] rounded-md border border-border p-4 bg-muted/30">
                {riskAnalysis ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{riskAnalysis}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center space-y-2">
                      <Shield className="h-12 w-12 mx-auto opacity-50" />
                      <p>Haz clic en "Analizar" para obtener un análisis de tu gestión de riesgo</p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="errors" className="mt-0">
              <ScrollArea className="h-[300px] rounded-md border border-border p-4 bg-muted/30">
                {errorAnalysis ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{errorAnalysis}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center space-y-2">
                      <AlertTriangle className="h-12 w-12 mx-auto opacity-50" />
                      <p>Haz clic en "Analizar" para identificar errores y áreas de mejora</p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
