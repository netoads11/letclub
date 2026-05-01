import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminLogin() {
  const nav = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // If already signed in as admin, jump to /admin
  useEffect(() => {
    if (!authLoading && user && isAdmin) nav("/admin", { replace: true });
  }, [authLoading, user, isAdmin, nav]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error || !data.user) {
        toast.error("Acesso negado. Credenciais inválidas.");
        return;
      }
      // Verify admin role server-side via has_role()
      const { data: roleRow, error: roleErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleErr || !roleRow) {
        await supabase.auth.signOut();
        toast.error("Acesso negado. Credenciais inválidas.");
        return;
      }
      toast.success("Bem-vindo, administrador");
      nav("/admin", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#2A2A2A] bg-[#141414]">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">
            LET&amp;PONTO
          </h1>
          <p className="mt-1 text-[11px] uppercase tracking-[0.25em] text-primary">
            Admin Console
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-[#2A2A2A] bg-[#141414] p-6 shadow-2xl"
        >
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-[#AAA]">E-mail</Label>
              <Input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@dominio.com"
                className="mt-1.5 border-[#2A2A2A] bg-[#0D0D0D]"
              />
            </div>
            <div>
              <Label className="text-xs text-[#AAA]">Senha</Label>
              <Input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 border-[#2A2A2A] bg-[#0D0D0D]"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full bg-primary font-display font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Entrar como administrador"
              )}
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/auth"
            className="text-xs text-[#888] transition-colors hover:text-primary"
          >
            ← Voltar ao app
          </Link>
        </div>
      </div>
    </div>
  );
}
