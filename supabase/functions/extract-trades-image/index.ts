const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Las capturas de IQ Option traen la hora local de Colombia (UTC-5, sin horario de verano):
// se conserva la fecha y hora tal cual y solo se fija el offset.
const normalizarFecha = (valor: unknown): string | null => {
  if (typeof valor !== "string") return null;
  const sinZona = valor.trim().replace(/(?:Z|[+-]\d{2}:?\d{2})$/, "");
  const partes = sinZona.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!partes) return null;
  const [, anioCapturado, mes, dia, hora, minuto, segundo] = partes;
  const anio = String(new Date().getFullYear()).padStart(4, "0");
  return `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}T${hora.padStart(2, "0")}:${minuto}:${segundo ?? "00"}-05:00`;
};

const SYSTEM = `Eres un extractor de datos de capturas de pantalla de historiales de trading (Deriv, IQ Option, MT5, Binance).
Lee TODAS las operaciones visibles en la imagen y devuélvelas con la herramienta. Reglas:
- instrumento: el activo real (ej. "Boom 1000 Index", "Crash 1000 Index", "EUR/USD"). X500/X1000 es apalancamiento, NO el activo; ponlo en apalancamiento.
- direccion: "Compra" (buy/up/call/flecha arriba/verde) o "Venta" (sell/down/put/flecha abajo).
- fechas en ISO 8601 copiando EXACTAMENTE la fecha y hora que se ven en la imagen (son hora de Colombia), sin convertirlas, sin restar ni sumar horas, sin agregar 'Z' ni zona horaria. Si solo hay una hora, usa la misma para entrada y salida.
- Si la imagen no muestra el año, usa el año actual.
- stake y resultado como números; resultado negativo si es pérdida.
- Si un dato no se ve, usa null. No inventes operaciones.`;

const tool = {
  type: "function",
  function: {
    name: "registrar_trades",
    description: "Operaciones leídas de la imagen",
    parameters: {
      type: "object",
      properties: {
        trades: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id_externo: { type: ["string", "null"] },
              instrumento: { type: "string" },
              apalancamiento: { type: ["string", "null"] },
              direccion: { type: "string", enum: ["Compra", "Venta"] },
              fecha_entrada: { type: ["string", "null"] },
              fecha_salida: { type: ["string", "null"] },
              stake_usd: { type: "number" },
              resultado_usd: { type: "number" },
            },
            required: ["id_externo", "instrumento", "apalancamiento", "direccion", "fecha_entrada", "fecha_salida", "stake_usd", "resultado_usd"],
          },
        },
      },
      required: ["trades"],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { image } = await req.json();
    if (typeof image !== "string" || !image.startsWith("data:image/")) return json({ error: "Imagen inválida" }, 400);
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "Falta configuración de IA" }, 500);

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: [
            { type: "text", text: "Extrae todas las operaciones de esta captura." },
            { type: "image_url", image_url: { url: image } },
          ] },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "registrar_trades" } },
      }),
    });
    if (r.status === 429) return json({ error: "Demasiadas solicitudes. Intenta en un momento." }, 429);
    if (r.status === 402) return json({ error: "Créditos de IA insuficientes." }, 402);
    if (!r.ok) {
      console.error("gateway", r.status, await r.text());
      return json({ error: "No se pudo leer la imagen" }, r.status === 403 ? 403 : 500);
    }
    const data = await r.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { trades: [] };
    const trades = (Array.isArray(parsed.trades) ? parsed.trades : []).map((t: Record<string, unknown>) => ({
      ...t,
      fecha_entrada: normalizarFecha(t.fecha_entrada),
      fecha_salida: normalizarFecha(t.fecha_salida),
    }));
    return json({ trades });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Error desconocido" }, 500);
  }
});
