import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ResetPassword() {
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase recovery flow puts a session via hash automatically
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) return toast.error("Senha deve ter pelo menos 6 caracteres");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada!");
    nav("/home", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 slide-up">
        <h1 className="font-display text-2xl font-bold">Nova senha</h1>
        <p className="text-sm text-muted-foreground">Defina uma nova senha para sua conta.</p>
        <div>
          <Label htmlFor="np">Nova senha</Label>
          <Input id="np" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} className="mt-1.5" />
        </div>
        <Button type="submit" disabled={busy || !ready} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
          {busy ? "Salvando..." : "Atualizar senha"}
        </Button>
        {!ready && <p className="text-xs text-muted-foreground">Validando link de recuperação...</p>}
      </form>
    </div>
  );
}
