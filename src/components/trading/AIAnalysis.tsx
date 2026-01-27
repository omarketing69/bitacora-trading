import { useState, useEffect } from "react";
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
import { Brain, Shield, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface AIAnalysisProps {
  trades: Trade[];
}

type AnalysisType = "risk" | "errors";

export function AIAnalysis({ trades }: AIAnalysisProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AnalysisType>("risk");
  const [riskAnalysis, setRiskAnalysis] = useState("");
  const [errorAnalysis, setErrorAnalysis] = useState("");
  const [isLoadingRisk, setIsLoadingRisk] = useState(false);
  const [isLoadingErrors, setIsLoadingErrors] = useState(false);
  // Track trades count to detect changes
  const [lastTradesCount, setLastTradesCount] = useState(0);

  const streamAnalysis = async (type: AnalysisType, currentTrades: Trade[]) => {
    if (currentTrades.length === 0) {
      toast.error("No hay trades para analizar");
      return;
    }

    const setLoading = type === "risk" ? setIsLoadingRisk : setIsLoadingErrors;
    const setAnalysis = type === "risk" ? setRiskAnalysis : setErrorAnalysis;

    setLoading(true);
    setAnalysis("");

    console.log(`[AIAnalysis] Sending ${currentTrades.length} trades for ${type} analysis`);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-trades`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ trades: currentTrades, analysisType: type }),
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
    // Always use the current trades prop directly
    streamAnalysis(activeTab, trades);
  };

  const currentAnalysis = activeTab === "risk" ? riskAnalysis : errorAnalysis;
  const isLoading = activeTab === "risk" ? isLoadingRisk : isLoadingErrors;

  // Limpiar análisis previos cuando se abre el diálogo o cuando cambian los trades
  useEffect(() => {
    if (open) {
      setRiskAnalysis("");
      setErrorAnalysis("");
      setLastTradesCount(trades.length);
      console.log(`[AIAnalysis] Dialog opened with ${trades.length} trades`);
    }
  }, [open, trades.length]);

  // Also clear when trades change significantly
  useEffect(() => {
    if (trades.length !== lastTradesCount && lastTradesCount > 0) {
      setRiskAnalysis("");
      setErrorAnalysis("");
      console.log(`[AIAnalysis] Trades changed: ${lastTradesCount} -> ${trades.length}`);
    }
  }, [trades.length, lastTradesCount]);

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
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Análisis con Inteligencia Artificial
          </DialogTitle>
        </DialogHeader>

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
                  ? "Analiza tu gestión de riesgo y money management"
                  : "Identifica errores y patrones de mejora en tus trades"}
              </p>
              <Button
                onClick={handleAnalyze}
                disabled={isLoading || trades.length === 0}
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
                    Analizar {trades.length} trades
                  </>
                )}
              </Button>
            </div>

            <TabsContent value="risk" className="mt-0">
              <ScrollArea className="h-[400px] rounded-md border border-border p-4 bg-muted/30">
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
              <ScrollArea className="h-[400px] rounded-md border border-border p-4 bg-muted/30">
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

        <p className="text-xs text-muted-foreground text-center mt-2">
          El análisis se basa en los datos de {trades.length} trades
        </p>
      </DialogContent>
    </Dialog>
  );
}
