import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ChevronLeft, Users, Target, UtensilsCrossed, Trophy, MessageSquare, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function Admin() {
  const { isAdmin, signOut } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<"dash" | "alunas" | "missoes" | "receitas" | "config">("dash");
  const [stats, setStats] = useState<any>({ total: 0, ativas: 0 });
  const [alunas, setAlunas] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [config, setConfig] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const [profs, today] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("checkins").select("user_id").gte("completed_at", new Date().toISOString().slice(0, 10)),
      ]);
      const list = profs.data ?? [];
      const ativasIds = new Set((today.data ?? []).map((c: any) => c.user_id));
      setAlunas(list);
      setStats({
        total: list.length,
        ativas: ativasIds.size,
        pct: list.length ? Math.round((ativasIds.size / list.length) * 100) : 0,
        topXp: [...list].sort((a, b) => b.xp_total - a.xp_total).slice(0, 10),
      });

      const m = await supabase.from("missions").select("*").order("dia_numero").order("ordem");
      setMissions(m.data ?? []);

      const c = await supabase.from("configuracoes_app").select("chave, valor");
      const map: Record<string, string> = {};
      (c.data ?? []).forEach((x: any) => map[x.chave] = x.valor);
      setConfig(map);
    })();
  }, [tab]);

  if (!isAdmin) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Acesso restrito</div>;

  const saveConfig = async (k: string) => {
    await supabase.from("configuracoes_app").update({ valor: config[k], updated_at: new Date().toISOString() }).eq("chave", k);
    toast.success("Salvo");
  };

  const toggleBlock = async (id: string, cur: boolean) => {
    await supabase.from("profiles").update({ bloqueado: !cur }).eq("id", id);
    setAlunas((p) => p.map((a) => a.id === id ? { ...a, bloqueado: !cur } : a));
    toast.success(!cur ? "Aluna bloqueada" : "Aluna desbloqueada");
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => nav("/home")} className="rounded-full bg-card p-2"><ChevronLeft className="h-5 w-5" /></button>
          <h1 className="font-display text-lg font-bold">Admin LET&PONTO</h1>
        </div>
        <button onClick={signOut} className="text-xs text-muted-foreground">Sair</button>
      </header>

      <div className="scrollbar-hide flex gap-2 overflow-x-auto border-b border-border px-5 py-3">
        {[
          { v: "dash", l: "Dashboard", i: Trophy },
          { v: "alunas", l: "Alunas", i: Users },
          { v: "missoes", l: "Missões", i: Target },
          { v: "receitas", l: "Receitas", i: UtensilsCrossed },
          { v: "config", l: "Config", i: Settings },
        ].map((t) => (
          <button key={t.v} onClick={() => setTab(t.v as any)} className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${tab === t.v ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>
            <t.i className="h-3.5 w-3.5" />{t.l}
          </button>
        ))}
      </div>

      <div className="mx-auto max-w-3xl px-5 py-5">
        {tab === "dash" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-card p-4"><p className="text-[10px] text-muted-foreground">Total alunas</p><p className="font-display text-2xl font-bold">{stats.total}</p></div>
              <div className="rounded-xl bg-card p-4"><p className="text-[10px] text-muted-foreground">Ativas hoje</p><p className="font-display text-2xl font-bold text-primary">{stats.ativas}</p></div>
              <div className="rounded-xl bg-card p-4"><p className="text-[10px] text-muted-foreground">Conclusão %</p><p className="font-display text-2xl font-bold">{stats.pct ?? 0}%</p></div>
            </div>
            <div className="rounded-xl bg-card p-4">
              <h3 className="font-display font-bold">Top 10 por XP</h3>
              <div className="mt-3 space-y-2">
                {(stats.topXp ?? []).map((a: any, i: number) => (
                  <div key={a.id} className="flex items-center justify-between text-sm">
                    <span><span className="text-muted-foreground">{i + 1}.</span> {a.full_name || a.email}</span>
                    <span className="font-bold text-primary">{a.xp_total} XP</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "alunas" && (
          <div className="space-y-2">
            {alunas.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl bg-card p-3">
                <div>
                  <p className="text-sm font-semibold">{a.full_name || "—"}</p>
                  <p className="text-[10px] text-muted-foreground">{a.email} • {a.xp_total} XP • streak {a.streak_atual}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => toggleBlock(a.id, a.bloqueado)}>
                  {a.bloqueado ? "Desbloquear" : "Bloquear"}
                </Button>
              </div>
            ))}
          </div>
        )}

        {tab === "missoes" && (
          <div className="space-y-2">
            {missions.map((m) => (
              <div key={m.id} className="rounded-xl bg-card p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{m.icone}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">Dia {m.dia_numero}</span>
                  <span className="font-semibold">{m.titulo}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{m.descricao_curta}</p>
              </div>
            ))}
            <p className="pt-3 text-center text-xs text-muted-foreground">CRUD completo via banco. UI de edição em produção pode ser estendida aqui.</p>
          </div>
        )}

        {tab === "receitas" && (
          <p className="py-10 text-center text-sm text-muted-foreground">Gestão de receitas: 10 receitas semeadas. Edição completa pode ser estendida com formulário e upload.</p>
        )}

        {tab === "config" && (
          <div className="space-y-5">
            {Object.entries(config).map(([k, v]) => (
              <div key={k}>
                <label className="text-xs text-muted-foreground">{k}</label>
                {k === "sistema_prompt_let" || k.startsWith("mensagem") ? (
                  <Textarea value={v} onChange={(e) => setConfig((p) => ({ ...p, [k]: e.target.value }))} className="mt-1 min-h-[100px]" />
                ) : (
                  <Input value={v} onChange={(e) => setConfig((p) => ({ ...p, [k]: e.target.value }))} className="mt-1" />
                )}
                <Button size="sm" onClick={() => saveConfig(k)} className="mt-1.5 bg-primary text-primary-foreground hover:bg-primary/90">Salvar</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
