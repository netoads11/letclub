import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ChevronLeft, Bell } from "lucide-react";

export default function Notificacoes() {
  const { profile } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase.from("notificacoes").select("*").eq("user_id", profile.id).order("created_at", { ascending: false });
      setItems(data ?? []);
      const unread = (data ?? []).filter((n) => !n.lida).map((n) => n.id);
      if (unread.length) await supabase.from("notificacoes").update({ lida: true }).in("id", unread);
    })();
  }, [profile]);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 px-5 py-4">
        <button onClick={() => nav(-1)} className="rounded-full bg-card p-2"><ChevronLeft className="h-5 w-5" /></button>
        <h1 className="font-display text-xl font-bold">Notificações</h1>
      </header>
      <div className="mx-auto max-w-md space-y-2 px-5">
        {items.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Sem notificações ainda.</p>}
        {items.map((n) => (
          <div key={n.id} className={`rounded-xl border p-4 ${!n.lida ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
            <div className="flex items-start gap-3">
              <Bell className="mt-0.5 h-4 w-4 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-semibold">{n.titulo}</p>
                <p className="mt-1 text-xs text-muted-foreground">{n.mensagem}</p>
                <p className="mt-2 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString("pt-BR")}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
