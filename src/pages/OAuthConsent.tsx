import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BarChart3, Loader2 } from "lucide-react";

// Typed wrapper for the beta auth.oauth namespace.
type OAuthResult = { data: any; error: { message: string } | null };
const oauth = (supabase.auth as unknown as {
  oauth: {
    getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
    approveAuthorization: (id: string) => Promise<OAuthResult>;
    denyAuthorization: (id: string) => Promise<OAuthResult>;
  };
}).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Falta el identificador de autorización.");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      setEmail(sess.session.user.email ?? null);
      try {
        const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) return setError(error.message);
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Error desconocido");
      }
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const { data, error } = approve
        ? await oauth.approveAuthorization(authorizationId)
        : await oauth.denyAuthorization(authorizationId);
      if (error) {
        setBusy(false);
        return setError(error.message);
      }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) {
        setBusy(false);
        return setError("El servidor de autorización no devolvió una redirección.");
      }
      window.location.href = target;
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  const clientName = details?.client?.name ?? "una aplicación";

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-lg p-6 glow-border space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-lg font-bold">
            {details ? `Conectar ${clientName} a Trade Journal Pro` : "Autorización"}
          </h1>
        </div>

        {error ? (
          <p className="text-sm text-destructive">No se pudo cargar esta solicitud: {error}</p>
        ) : !details ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {clientName} podrá consultar tus operaciones y editar sus notas mientras tengas sesión iniciada como{" "}
              <span className="text-foreground font-medium">{email}</span>.
            </p>
            {details?.redirect_uri && (
              <p className="text-xs text-muted-foreground break-all">Destino: {details.redirect_uri}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Esto no omite los permisos de la app: solo verás tus propios datos.
            </p>
            <div className="flex gap-2">
              <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aprobar"}
              </Button>
              <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
                Cancelar conexión
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
