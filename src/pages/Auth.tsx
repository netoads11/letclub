import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";

const signInSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(100),
});

const signUpSchema = signInSchema.extend({
  full_name: z.string().trim().min(2, "Informe seu nome").max(100),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { path: ["confirm"], message: "As senhas não conferem" });

export default function Auth() {
  const { user, profile, loading } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetMode, setResetMode] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      nav(profile && !profile.onboarding_completed ? "/onboarding" : "/home", { replace: true });
    }
  }, [user, profile, loading, nav]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (resetMode) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        toast.success("E-mail de recuperação enviado!");
        setResetMode(false);
        return;
      }

      if (tab === "login") {
        const parsed = signInSchema.safeParse({ email, password });
        if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const parsed = signUpSchema.safeParse({ email, password, confirm, full_name: fullName });
        if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin + "/home",
            data: { full_name: fullName.trim() },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Bem-vinda 💚");
      }
    } catch (err: any) {
      const msg = err?.message || "Erro ao processar";
      if (msg.includes("Invalid login")) toast.error("E-mail ou senha incorretos");
      else if (msg.includes("already registered")) toast.error("Esse e-mail já está cadastrado");
      else toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-md slide-up">
        <h1 className="text-center font-display text-3xl font-bold text-primary text-glow">
          LET<span className="text-foreground">&amp;</span>PONTO
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {resetMode ? "Recuperar senha" : "Sua jornada começa aqui"}
        </p>

        {!resetMode && (
          <div className="mx-auto mt-8 grid w-full max-w-sm grid-cols-2 rounded-xl bg-card p-1">
            <button
              onClick={() => setTab("login")}
              className={`rounded-lg py-2 text-sm font-medium transition-colors ${tab === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >Entrar</button>
            <button
              onClick={() => setTab("signup")}
              className={`rounded-lg py-2 text-sm font-medium transition-colors ${tab === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >Criar conta</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mx-auto mt-6 max-w-sm space-y-4">
          {tab === "signup" && !resetMode && (
            <div>
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={100} className="mt-1.5" placeholder="Seu nome" />
            </div>
          )}
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5" placeholder="voce@email.com" />
          </div>
          {!resetMode && (
            <div>
              <Label htmlFor="pw">Senha</Label>
              <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1.5" placeholder="••••••••" />
            </div>
          )}
          {tab === "signup" && !resetMode && (
            <div>
              <Label htmlFor="cpw">Confirmar senha</Label>
              <Input id="cpw" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} className="mt-1.5" placeholder="••••••••" />
            </div>
          )}

          <Button type="submit" disabled={busy} className="w-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90">
            {busy ? "Aguarde..." : resetMode ? "Enviar link" : tab === "login" ? "Entrar" : "Criar conta"}
          </Button>

          {tab === "login" && !resetMode && (
            <button type="button" onClick={() => setResetMode(true)} className="block w-full text-center text-xs text-muted-foreground hover:text-primary">
              Esqueci minha senha
            </button>
          )}
          {resetMode && (
            <button type="button" onClick={() => setResetMode(false)} className="block w-full text-center text-xs text-muted-foreground hover:text-primary">
              Voltar
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
