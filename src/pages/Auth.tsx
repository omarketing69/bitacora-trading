import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Loader2, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { oauthReturnPath } from "@/lib/oauth-return-path";

const authSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});

export default function Auth() {
  const { user, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [params] = useSearchParams();
  const next = oauthReturnPath(params.get("next"));

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    if (next !== "/") {
      window.location.replace(next);
      return null;
    }
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-xl bg-primary/10 mb-4">
            <BarChart3 className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gradient">Trading Journal</h1>
          <p className="text-muted-foreground">Bitácora de Operaciones</p>
        </div>

        {/* Auth Card */}
        <div className="bg-card border border-border rounded-lg p-6 glow-border">
          <Tabs defaultValue="login" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-muted">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="register">Registrarse</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <LoginForm isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} />
            </TabsContent>

            <TabsContent value="register">
              <RegisterForm isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} next={next} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function LoginForm({
  isSubmitting,
  setIsSubmitting,
}: {
  isSubmitting: boolean;
  setIsSubmitting: (v: boolean) => void;
}) {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showReset, setShowReset] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = authSchema.safeParse({ email, password });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    setIsSubmitting(false);

    if (error) {
      toast.error("Credenciales incorrectas");
    } else {
      toast.success("¡Bienvenido!");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      toast.error("Ingresa un email válido");
      return;
    }

    setIsSubmitting(true);
    const { error } = await resetPassword(email);
    setIsSubmitting(false);

    if (error) {
      toast.error("Error al enviar el correo de recuperación");
    } else {
      toast.success("¡Revisa tu correo! Te enviamos un enlace para restablecer tu contraseña.");
      setShowReset(false);
    }
  };

  if (showReset) {
    return (
      <form onSubmit={handleResetPassword} className="space-y-4">
        <div className="text-center mb-4">
          <h3 className="font-semibold">Recuperar Contraseña</h3>
          <p className="text-sm text-muted-foreground">Te enviaremos un enlace a tu correo</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reset-email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="reset-email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 bg-background border-border"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full bg-primary hover:bg-primary/80" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Enviar Enlace
        </Button>
        <Button 
          type="button" 
          variant="ghost" 
          className="w-full" 
          onClick={() => setShowReset(false)}
        >
          Volver al Login
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="login-email"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10 bg-background border-border"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="login-password">Contraseña</Label>
          <button
            type="button"
            onClick={() => setShowReset(true)}
            className="text-xs text-primary hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="login-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10 bg-background border-border"
            required
          />
        </div>
      </div>
      <Button type="submit" className="w-full bg-primary hover:bg-primary/80" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Iniciar Sesión
      </Button>
    </form>
  );
}

function RegisterForm({
  isSubmitting,
  setIsSubmitting,
  next = "/",
}: {
  isSubmitting: boolean;
  setIsSubmitting: (v: boolean) => void;
  next?: string;
}) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    const result = authSchema.safeParse({ email, password });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    const { error } = await signUp(email, password, new URL(next, window.location.origin).href);
    setIsSubmitting(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("¡Cuenta creada! Ya puedes iniciar sesión.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="register-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="register-email"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10 bg-background border-border"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="register-password">Contraseña</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="register-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10 bg-background border-border"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="register-confirm">Confirmar Contraseña</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="register-confirm"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="pl-10 bg-background border-border"
            required
          />
        </div>
      </div>
      <Button type="submit" className="w-full bg-profit hover:bg-profit/80 text-profit-foreground" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Crear Cuenta
      </Button>
    </form>
  );
}
