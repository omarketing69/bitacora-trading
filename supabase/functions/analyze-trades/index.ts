import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RISK_MANAGEMENT_SYSTEM_PROMPT = `Eres un experto en trading y gestión de riesgo con más de 20 años de experiencia. Tu especialidad es analizar el money management y la gestión de riesgo de traders.

Analiza los trades proporcionados y evalúa:
1. **Riesgo por operación**: ¿El trader está arriesgando un porcentaje apropiado de su cuenta? (Recomendado: 1-2% máximo)
2. **Consistencia del stake**: ¿Los tamaños de posición son consistentes o varían demasiado?
3. **Drawdown**: Analiza las rachas perdedoras y cómo afectaron la cuenta
4. **Risk/Reward implícito**: Basándote en los resultados, ¿cuál parece ser el R:R promedio?
5. **Sobreapalancamiento**: ¿Hay señales de que el trader esté tomando riesgos excesivos?
6. **Preservación de capital**: ¿El trader protege su capital adecuadamente?

Proporciona:
- Un resumen ejecutivo de la gestión de riesgo
- Puntuación del 1-10 para la gestión de riesgo
- 3 fortalezas identificadas
- 3 áreas de mejora con recomendaciones específicas
- Sugerencias concretas para mejorar

Responde en español. Sé directo, específico y constructivo.`;

const ERROR_ANALYSIS_SYSTEM_PROMPT = `Eres un coach de trading experto especializado en psicología del trading y análisis de errores. Tu objetivo es identificar patrones de error y áreas de mejora.

Analiza los trades proporcionados (especialmente las notas y motivos de salida) para identificar:
1. **Errores de entrada**: Entradas prematuras, sin confirmación, contra tendencia, etc.
2. **Errores de salida**: Salidas emocionales, no respetar stops, tomar profits muy pronto
3. **Errores de gestión**: Mover stops, promediar posiciones perdedoras, etc.
4. **Errores psicológicos**: Revenge trading, FOMO, miedo, overtrading
5. **Patrones recurrentes**: Errores que se repiten

Para cada trade analizado:
- Identifica el posible error (si existe)
- Explica por qué fue un error
- Sugiere qué debería haber hecho diferente

Al final proporciona:
- Los 3 errores más frecuentes del trader
- Plan de acción específico para corregir cada error
- Ejercicios o prácticas recomendadas

Responde en español. Sé empático pero honesto. El objetivo es ayudar al trader a mejorar.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trades, analysisType } = await req.json();
    
    if (!trades || trades.length === 0) {
      return new Response(
        JSON.stringify({ error: "No hay trades para analizar" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = analysisType === "risk" 
      ? RISK_MANAGEMENT_SYSTEM_PROMPT 
      : ERROR_ANALYSIS_SYSTEM_PROMPT;

    // Prepare trades data for analysis
    const tradesContext = trades.map((t: any, i: number) => {
      const base = `Trade ${i + 1}:
- Fecha: ${t.fecha_entrada} a ${t.fecha_salida}
- Instrumento: ${t.instrumento}
- Dirección: ${t.direccion}
- Stake: $${t.stake_usd}
- Resultado: $${t.resultado_usd} (${t.resultado_pct_cuenta?.toFixed(2) || 'N/A'}%)
- Riesgo cuenta: ${t.riesgo_pct_cuenta?.toFixed(2) || 'N/A'}%
- Saldo antes: $${t.saldo_antes} | Saldo después: $${t.saldo_despues}`;

      if (analysisType === "errors") {
        return `${base}
- Setup: ${t.tipo_setup || 'No especificado'}
- Entrada por: ${t.entrada_por || 'No especificado'}
- Motivo salida: ${t.motivo_salida || 'No especificado'}
- Notas: ${t.notas || 'Sin notas'}`;
      }
      return base;
    }).join("\n\n");

    const userMessage = analysisType === "risk"
      ? `Analiza la gestión de riesgo de estos ${trades.length} trades:\n\n${tradesContext}`
      : `Analiza los errores y áreas de mejora en estos ${trades.length} trades:\n\n${tradesContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes excedido. Intenta de nuevo más tarde." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Agrega fondos a tu workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Error en el servicio de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("analyze-trades error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
