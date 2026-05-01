import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ChevronLeft, Users, Target, UtensilsCrossed, Trophy, Settings, Award, MessageCircle, Bot, Pin, Trash2, AlertTriangle, Send, ThumbsUp, ThumbsDown, Plus, X, KeyRound, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type Tab = "dash" | "alunas" | "missoes" | "receitas" | "badges" | "comunidade" | "chat" | "config";

export default function Admin() {
  const { isAdmin, signOut } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("dash");

  // Dashboard
  const [stats, setStats] = useState<any>({ total: 0, ativas: 0, pct: 0, topXp: [] });
  const [dropoff, setDropoff] = useState<{ dia: string; abandono: number }[]>([]);

  // Alunas
  const [alunas, setAlunas] = useState<any[]>([]);

  // Missions
  const [missions, setMissions] = useState<any[]>([]);

  // Receitas
  const [receitas, setReceitas] = useState<any[]>([]);
  const [editingReceita, setEditingReceita] = useState<any | null>(null);

  // Aluna detail
  const [alunaDetail, setAlunaDetail] = useState<any | null>(null);
  const [alunaDetailData, setAlunaDetailData] = useState<{ checkins: any[]; pesos: any[]; badges: any[] }>({ checkins: [], pesos: [], badges: [] });

  // Badges
  const [badges, setBadges] = useState<any[]>([]);
  const [badgeUnlocks, setBadgeUnlocks] = useState<Record<string, any[]>>({});
  const [editingBadge, setEditingBadge] = useState<any | null>(null);

  // Comunidade
  const [posts, setPosts] = useState<any[]>([]);
  const [broadcastText, setBroadcastText] = useState("");

  // Chat IA
  const [chatLogs, setChatLogs] = useState<any[]>([]);
  const [chatStats, setChatStats] = useState<{ up: number; down: number; top: { q: string; n: number }[] }>({ up: 0, down: 0, top: [] });

  // Config
  const [config, setConfig] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAdmin) return;
    loadTab();
  }, [tab, isAdmin]);

  const loadTab = async () => {
    if (tab === "dash") {
      const [profs, today, allCheckins] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("checkins").select("user_id").gte("completed_at", new Date().toISOString().slice(0, 10)),
        supabase.from("checkins").select("user_id, dia_numero"),
      ]);
      const list = profs.data ?? [];
      const ativasIds = new Set((today.data ?? []).map((c: any) => c.user_id));
      setStats({
        total: list.length,
        ativas: ativasIds.size,
        pct: list.length ? Math.round((ativasIds.size / list.length) * 100) : 0,
        topXp: [...list].sort((a: any, b: any) => (b.xp_total ?? 0) - (a.xp_total ?? 0)).slice(0, 10),
      });

      // Dropoff per day: users who started but did no checkin AFTER that day
      const startedUsers = list.filter((p: any) => p.challenge_start_date);
      const maxDayPerUser: Record<string, number> = {};
      (allCheckins.data ?? []).forEach((c: any) => {
        if (!maxDayPerUser[c.user_id] || c.dia_numero > maxDayPerUser[c.user_id]) {
          maxDayPerUser[c.user_id] = c.dia_numero;
        }
      });
      const drop: { dia: string; abandono: number }[] = [];
      for (let d = 1; d <= 15; d++) {
        let n = 0;
        startedUsers.forEach((u: any) => {
          const last = maxDayPerUser[u.id] ?? 0;
          if (last === d) n++; // stopped at this day
        });
        drop.push({ dia: `D${d}`, abandono: n });
      }
      setDropoff(drop);
    }
    if (tab === "alunas") {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      setAlunas(data ?? []);
    }
    if (tab === "missoes") {
      const { data } = await supabase.from("missions").select("*").order("dia_numero").order("ordem");
      setMissions(data ?? []);
    }
    if (tab === "receitas") {
      const { data } = await supabase.from("receitas").select("*").order("dia_numero", { ascending: true, nullsFirst: false }).order("nome");
      setReceitas(data ?? []);
    }
    if (tab === "badges") {
      const { data } = await supabase.from("badges").select("*").order("xp_reward");
      setBadges(data ?? []);
      const ub = await supabase.from("user_badges").select("badge_id, user_id, profiles:user_id(full_name, email)");
      const map: Record<string, any[]> = {};
      (ub.data ?? []).forEach((u: any) => {
        if (!map[u.badge_id]) map[u.badge_id] = [];
        map[u.badge_id].push(u.profiles);
      });
      setBadgeUnlocks(map);
    }
    if (tab === "comunidade") {
      const { data } = await supabase
        .from("posts_comunidade")
        .select("*, profiles:user_id(full_name, email)")
        .order("fixado", { ascending: false })
        .order("reportado", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);
      setPosts(data ?? []);
    }
    if (tab === "chat") {
      const { data: logs } = await supabase
        .from("chat_messages")
        .select("id, content, feedback, created_at, role")
        .eq("role", "user")
        .order("created_at", { ascending: false })
        .limit(200);
      setChatLogs(logs ?? []);

      const { data: fb } = await supabase.from("chat_messages").select("feedback").not("feedback", "is", null);
      const up = (fb ?? []).filter((x: any) => x.feedback === "positivo").length;
      const down = (fb ?? []).filter((x: any) => x.feedback === "negativo").length;
      const counts: Record<string, number> = {};
      (logs ?? []).forEach((l: any) => {
        const key = (l.content || "").slice(0, 60).toLowerCase().trim();
        if (!key) return;
        counts[key] = (counts[key] ?? 0) + 1;
      });
      const top = Object.entries(counts).map(([q, n]) => ({ q, n })).sort((a, b) => b.n - a.n).slice(0, 5);
      setChatStats({ up, down, top });
    }
    if (tab === "config" || tab === "chat") {
      const { data } = await supabase.from("configuracoes_app").select("chave, valor");
      const map: Record<string, string> = {};
      (data ?? []).forEach((x: any) => (map[x.chave] = x.valor));
      setConfig(map);
    }
  };

  if (!isAdmin) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Acesso restrito</div>;

  const saveConfig = async (k: string, v?: string) => {
    const value = v ?? config[k] ?? "";
    const { data: existing } = await supabase.from("configuracoes_app").select("id").eq("chave", k).maybeSingle();
    if (existing) {
      await supabase.from("configuracoes_app").update({ valor: value, updated_at: new Date().toISOString() }).eq("chave", k);
    } else {
      await supabase.from("configuracoes_app").insert({ chave: k, valor: value });
    }
    setConfig((p) => ({ ...p, [k]: value }));
    toast.success("Salvo");
  };

  const toggleBlock = async (id: string, cur: boolean) => {
    await supabase.from("profiles").update({ bloqueado: !cur }).eq("id", id);
    setAlunas((p) => p.map((a) => (a.id === id ? { ...a, bloqueado: !cur } : a)));
    toast.success(!cur ? "Aluna bloqueada" : "Aluna desbloqueada");
  };

  // Badges CRUD
  const saveBadge = async (b: any) => {
    if (b.id) {
      const { error } = await supabase.from("badges").update({
        nome: b.nome, descricao: b.descricao, icone: b.icone, xp_reward: Number(b.xp_reward) || 0, ativo: b.ativo,
      }).eq("id", b.id);
      if (error) return toast.error(error.message);
    } else {
      const slug = (b.nome || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40);
      const { error } = await supabase.from("badges").insert({
        slug, nome: b.nome, descricao: b.descricao || "", icone: b.icone || "🏆", xp_reward: Number(b.xp_reward) || 0, ativo: b.ativo ?? true,
      });
      if (error) return toast.error(error.message);
    }
    toast.success("Badge salva");
    setEditingBadge(null);
    loadTab();
  };

  const deleteBadge = async (id: string) => {
    if (!confirm("Excluir esta badge?")) return;
    const { error } = await supabase.from("badges").delete().eq("id", id);
    if (error) return toast.error(error.message);
    loadTab();
  };

  // Receitas CRUD
  const newReceita = () => setEditingReceita({
    nome: "", tipo_refeicao: "cafe", dia_numero: null,
    ingredientes: [], modo_preparo: [], tempo_preparo: 10,
    restricoes_compativeis: [], imagem_url: "", ativo: true,
  });

  const saveReceita = async (r: any) => {
    const payload = {
      nome: r.nome,
      tipo_refeicao: r.tipo_refeicao,
      dia_numero: r.dia_numero === "" || r.dia_numero === null || r.dia_numero === undefined ? null : Number(r.dia_numero),
      ingredientes: r.ingredientes ?? [],
      modo_preparo: r.modo_preparo ?? [],
      tempo_preparo: Number(r.tempo_preparo) || 10,
      restricoes_compativeis: r.restricoes_compativeis ?? [],
      imagem_url: r.imagem_url || null,
      ativo: r.ativo ?? true,
    };
    if (!payload.nome) return toast.error("Nome obrigatório");
    if (r.id) {
      const { error } = await supabase.from("receitas").update(payload).eq("id", r.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("receitas").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success("Receita salva");
    setEditingReceita(null);
    loadTab();
  };

  const deleteReceita = async (id: string) => {
    if (!confirm("Excluir esta receita?")) return;
    const { error } = await supabase.from("receitas").delete().eq("id", id);
    if (error) return toast.error(error.message);
    loadTab();
  };

  // Aluna detail
  const openAlunaDetail = async (a: any) => {
    setAlunaDetail(a);
    const [ckRes, psRes, ubRes] = await Promise.all([
      supabase.from("checkins").select("*, missions:mission_id(titulo, dia_numero)").eq("user_id", a.id).order("completed_at", { ascending: false }),
      supabase.from("pesos_historico").select("*").eq("user_id", a.id).order("registrado_em", { ascending: true }),
      supabase.from("user_badges").select("*, badges:badge_id(nome, icone)").eq("user_id", a.id),
    ]);
    setAlunaDetailData({
      checkins: ckRes.data ?? [],
      pesos: psRes.data ?? [],
      badges: ubRes.data ?? [],
    });
  };

  const resetSenha = async (email: string) => {
    if (!email) return toast.error("Sem email");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success(`Email de reset enviado para ${email}`);
  };

  const alunaStatus = (a: any): { label: string; cls: string } => {
    if (a.bloqueado) return { label: "Inativa", cls: "bg-muted text-muted-foreground" };
    const start = a.challenge_start_date ? new Date(a.challenge_start_date) : null;
    if (!start) return { label: "Inativa", cls: "bg-muted text-muted-foreground" };
    const diff = Math.floor((Date.now() - start.getTime()) / 86400000) + 1;
    if (diff > 15) return { label: "Concluída", cls: "bg-primary/20 text-primary" };
    return { label: "Ativa", cls: "bg-green-500/20 text-green-500" };
  };

  const alunaDia = (a: any): number => {
    if (!a.challenge_start_date) return 0;
    const start = new Date(a.challenge_start_date);
    return Math.min(15, Math.floor((Date.now() - start.getTime()) / 86400000) + 1);
  };

  // Comunidade actions
  const removePost = async (id: string) => {
    await supabase.from("posts_comunidade").update({ removido: true }).eq("id", id);
    setPosts((p) => p.map((x) => (x.id === id ? { ...x, removido: true } : x)));
    toast.success("Post removido");
  };

  const togglePin = async (id: string, cur: boolean) => {
    await supabase.from("posts_comunidade").update({ fixado: !cur }).eq("id", id);
    setPosts((p) => p.map((x) => (x.id === id ? { ...x, fixado: !cur } : x)));
  };

  const broadcast = async () => {
    if (!broadcastText.trim()) return toast.error("Escreva uma mensagem");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Pin a community post from admin
    const { error: postErr } = await supabase.from("posts_comunidade").insert({
      user_id: user.id, texto: broadcastText, fixado: true,
    });
    if (postErr) return toast.error(postErr.message);

    // Notify all users
    const { data: users } = await supabase.from("profiles").select("id");
    if (users?.length) {
      const rows = users.map((u: any) => ({
        user_id: u.id, tipo: "sistema" as const, titulo: "Comunicado da Let", mensagem: broadcastText,
      }));
      // Insert in batches to avoid huge payloads
      for (let i = 0; i < rows.length; i += 100) {
        await supabase.from("notificacoes").insert(rows.slice(i, i + 100));
      }
    }
    toast.success("Comunicado enviado e fixado");
    setBroadcastText("");
    loadTab();
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
          { v: "badges", l: "Badges", i: Award },
          { v: "comunidade", l: "Comunidade", i: MessageCircle },
          { v: "chat", l: "Chat IA", i: Bot },
          { v: "config", l: "Config", i: Settings },
        ].map((t) => (
          <button key={t.v} onClick={() => setTab(t.v as Tab)} className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${tab === t.v ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>
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
              <div className="rounded-xl bg-card p-4"><p className="text-[10px] text-muted-foreground">Conclusão %</p><p className="font-display text-2xl font-bold">{stats.pct}%</p></div>
            </div>

            <div className="rounded-xl bg-card p-4">
              <h3 className="font-display font-bold">Abandono por dia</h3>
              <p className="mb-2 text-[10px] text-muted-foreground">Alunas que pararam de fazer check-in após cada dia</p>
              <div className="h-56 w-full">
                <ResponsiveContainer>
                  <LineChart data={dropoff} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                    <Line type="monotone" dataKey="abandono" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
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
            {alunas.map((a) => {
              const st = alunaStatus(a);
              return (
                <div key={a.id} className="rounded-xl bg-card p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{a.full_name || "—"}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.cls}`}>{st.label}</span>
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">{a.email}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Dia {alunaDia(a)}/15 • {a.xp_total ?? 0} XP • streak {a.streak_atual ?? 0}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openAlunaDetail(a)}>
                        <Eye className="mr-1 h-3.5 w-3.5" />Ver
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => resetSenha(a.email)}>
                        <KeyRound className="mr-1 h-3.5 w-3.5" />Reset senha
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleBlock(a.id, a.bloqueado)}>
                        {a.bloqueado ? "Desbloquear" : "Bloquear"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
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
          </div>
        )}

        {tab === "receitas" && (
          <div className="space-y-3">
            <Button onClick={newReceita} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-1 h-4 w-4" /> Nova receita
            </Button>

            {editingReceita && (
              <div className="space-y-3 rounded-xl border border-primary/30 bg-card p-3">
                <div>
                  <label className="text-[10px] text-muted-foreground">Nome</label>
                  <Input value={editingReceita.nome} onChange={(e) => setEditingReceita({ ...editingReceita, nome: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">Tipo</label>
                    <select
                      className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                      value={editingReceita.tipo_refeicao}
                      onChange={(e) => setEditingReceita({ ...editingReceita, tipo_refeicao: e.target.value })}
                    >
                      <option value="cafe">Café</option>
                      <option value="almoco">Almoço</option>
                      <option value="lanche">Lanche</option>
                      <option value="jantar">Jantar</option>
                      <option value="cha">Chá</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Dia (opcional)</label>
                    <Input
                      type="number"
                      value={editingReceita.dia_numero ?? ""}
                      onChange={(e) => setEditingReceita({ ...editingReceita, dia_numero: e.target.value === "" ? null : e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-muted-foreground">Tempo de preparo (min)</label>
                  <Input
                    type="number"
                    value={editingReceita.tempo_preparo}
                    onChange={(e) => setEditingReceita({ ...editingReceita, tempo_preparo: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-[10px] text-muted-foreground">Imagem URL</label>
                  <Input value={editingReceita.imagem_url ?? ""} onChange={(e) => setEditingReceita({ ...editingReceita, imagem_url: e.target.value })} />
                </div>

                <div>
                  <p className="mb-1 text-[10px] text-muted-foreground">Restrições compatíveis</p>
                  <div className="flex flex-wrap gap-3">
                    {["vegetariana", "lactose", "gluten", "gestante"].map((r) => {
                      const checked = (editingReceita.restricoes_compativeis ?? []).includes(r);
                      return (
                        <label key={r} className="flex items-center gap-1.5 text-xs">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              const cur = editingReceita.restricoes_compativeis ?? [];
                              setEditingReceita({
                                ...editingReceita,
                                restricoes_compativeis: v ? [...cur, r] : cur.filter((x: string) => x !== r),
                              });
                            }}
                          />{r}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">Ingredientes</p>
                    <Button size="sm" variant="ghost" onClick={() => setEditingReceita({ ...editingReceita, ingredientes: [...(editingReceita.ingredientes ?? []), { nome: "", quantidade: "" }] })}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    {(editingReceita.ingredientes ?? []).map((ing: any, i: number) => (
                      <div key={i} className="flex gap-1.5">
                        <Input
                          placeholder="Nome"
                          value={ing.nome ?? ""}
                          onChange={(e) => {
                            const arr = [...editingReceita.ingredientes];
                            arr[i] = { ...arr[i], nome: e.target.value };
                            setEditingReceita({ ...editingReceita, ingredientes: arr });
                          }}
                        />
                        <Input
                          placeholder="Quantidade"
                          value={ing.quantidade ?? ""}
                          onChange={(e) => {
                            const arr = [...editingReceita.ingredientes];
                            arr[i] = { ...arr[i], quantidade: e.target.value };
                            setEditingReceita({ ...editingReceita, ingredientes: arr });
                          }}
                        />
                        <Button size="icon" variant="ghost" onClick={() => {
                          const arr = editingReceita.ingredientes.filter((_: any, idx: number) => idx !== i);
                          setEditingReceita({ ...editingReceita, ingredientes: arr });
                        }}><X className="h-3 w-3" /></Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">Modo de preparo (passos)</p>
                    <Button size="sm" variant="ghost" onClick={() => setEditingReceita({ ...editingReceita, modo_preparo: [...(editingReceita.modo_preparo ?? []), ""] })}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    {(editingReceita.modo_preparo ?? []).map((step: string, i: number) => (
                      <div key={i} className="flex gap-1.5">
                        <span className="pt-2 text-[10px] text-muted-foreground">{i + 1}.</span>
                        <Textarea
                          className="min-h-[44px]"
                          value={step}
                          onChange={(e) => {
                            const arr = [...editingReceita.modo_preparo];
                            arr[i] = e.target.value;
                            setEditingReceita({ ...editingReceita, modo_preparo: arr });
                          }}
                        />
                        <Button size="icon" variant="ghost" onClick={() => {
                          const arr = editingReceita.modo_preparo.filter((_: any, idx: number) => idx !== i);
                          setEditingReceita({ ...editingReceita, modo_preparo: arr });
                        }}><X className="h-3 w-3" /></Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch checked={editingReceita.ativo} onCheckedChange={(v) => setEditingReceita({ ...editingReceita, ativo: v })} />
                  <span className="text-xs">Ativa</span>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveReceita(editingReceita)}>Salvar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingReceita(null)}>Cancelar</Button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-xl bg-card">
              <table className="w-full text-xs">
                <thead className="border-b border-border text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left">Nome</th>
                    <th className="p-2 text-left">Tipo</th>
                    <th className="p-2 text-left">Dia</th>
                    <th className="p-2 text-left">Tempo</th>
                    <th className="p-2 text-left">Ativa</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {receitas.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="p-2 font-medium">{r.nome}</td>
                      <td className="p-2">{r.tipo_refeicao}</td>
                      <td className="p-2">{r.dia_numero ?? "—"}</td>
                      <td className="p-2">{r.tempo_preparo}min</td>
                      <td className="p-2">{r.ativo ? "✓" : "—"}</td>
                      <td className="p-2 text-right">
                        <Button size="sm" variant="ghost" onClick={() => setEditingReceita(r)}>Editar</Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteReceita(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </td>
                    </tr>
                  ))}
                  {receitas.length === 0 && (
                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhuma receita.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "badges" && (
          <div className="space-y-3">
            <Button onClick={() => setEditingBadge({ nome: "", descricao: "", icone: "🏆", xp_reward: 10, ativo: true })} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              + Nova badge
            </Button>
            {editingBadge && (
              <div className="space-y-2 rounded-xl border border-primary/30 bg-card p-3">
                <Input placeholder="Nome" value={editingBadge.nome} onChange={(e) => setEditingBadge({ ...editingBadge, nome: e.target.value })} />
                <Textarea placeholder="Descrição" value={editingBadge.descricao} onChange={(e) => setEditingBadge({ ...editingBadge, descricao: e.target.value })} />
                <div className="flex gap-2">
                  <Input className="w-20" placeholder="🏆" value={editingBadge.icone} onChange={(e) => setEditingBadge({ ...editingBadge, icone: e.target.value })} />
                  <Input type="number" placeholder="XP" value={editingBadge.xp_reward} onChange={(e) => setEditingBadge({ ...editingBadge, xp_reward: e.target.value })} />
                  <div className="flex items-center gap-2 px-2">
                    <Switch checked={editingBadge.ativo} onCheckedChange={(v) => setEditingBadge({ ...editingBadge, ativo: v })} />
                    <span className="text-xs">Ativo</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveBadge(editingBadge)}>Salvar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingBadge(null)}>Cancelar</Button>
                </div>
              </div>
            )}
            {badges.map((b) => (
              <div key={b.id} className="rounded-xl bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{b.icone}</span>
                    <div>
                      <p className="text-sm font-semibold">{b.nome} {!b.ativo && <span className="text-[10px] text-muted-foreground">(inativa)</span>}</p>
                      <p className="text-[11px] text-muted-foreground">{b.descricao}</p>
                      <p className="mt-0.5 text-[10px] text-primary">+{b.xp_reward} XP</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditingBadge(b)}>Editar</Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteBadge(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="mt-2 border-t border-border pt-2">
                  <p className="text-[10px] text-muted-foreground">Desbloqueada por {(badgeUnlocks[b.id] ?? []).length} aluna(s)</p>
                  {(badgeUnlocks[b.id] ?? []).slice(0, 5).map((u: any, i: number) => (
                    <p key={i} className="text-[11px]">{u?.full_name || u?.email}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "comunidade" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-primary/30 bg-card p-3">
              <h3 className="mb-2 text-sm font-bold">📢 Comunicado para todas</h3>
              <Textarea placeholder="Mensagem que será enviada como notificação e fixada na comunidade..." value={broadcastText} onChange={(e) => setBroadcastText(e.target.value)} className="min-h-[80px]" />
              <Button onClick={broadcast} className="mt-2 w-full bg-primary text-primary-foreground hover:bg-primary/90">
                <Send className="mr-2 h-3.5 w-3.5" />Enviar comunicado
              </Button>
            </div>

            <div className="space-y-2">
              {posts.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Nenhum post.</p>}
              {posts.map((p) => (
                <div key={p.id} className={`rounded-xl border p-3 ${p.removido ? "border-border bg-muted/30 opacity-50" : p.reportado ? "border-destructive/50 bg-destructive/5" : p.fixado ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold">{p.profiles?.full_name || p.profiles?.email || "—"}</p>
                    <div className="flex items-center gap-1">
                      {p.fixado && <Pin className="h-3 w-3 text-primary" />}
                      {p.reportado && <AlertTriangle className="h-3 w-3 text-destructive" />}
                      {p.removido && <span className="text-[10px] text-muted-foreground">removido</span>}
                    </div>
                  </div>
                  <p className="mt-1 text-sm">{p.texto}</p>
                  {p.imagem_url && <img src={p.imagem_url} alt="" className="mt-2 max-h-40 rounded-lg" />}
                  <div className="mt-2 flex gap-2">
                    {!p.removido && <Button size="sm" variant="ghost" onClick={() => removePost(p.id)}><Trash2 className="mr-1 h-3 w-3" />Remover</Button>}
                    <Button size="sm" variant="ghost" onClick={() => togglePin(p.id, p.fixado)}><Pin className="mr-1 h-3 w-3" />{p.fixado ? "Desafixar" : "Fixar"}</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "chat" && (
          <div className="space-y-4">
            <div className="rounded-xl bg-card p-4">
              <label className="text-xs text-muted-foreground">System prompt da Let</label>
              <Textarea
                value={config.sistema_prompt_let ?? ""}
                onChange={(e) => setConfig((p) => ({ ...p, sistema_prompt_let: e.target.value }))}
                className="mt-1 min-h-[140px] text-xs"
              />
              <Button size="sm" onClick={() => saveConfig("sistema_prompt_let", config.sistema_prompt_let)} className="mt-2">Salvar prompt</Button>
            </div>

            <div className="rounded-xl bg-card p-4">
              <h3 className="mb-2 text-sm font-bold">Sugestões (chips)</h3>
              {[1, 2, 3].map((n) => {
                const k = `sugestoes_chat_${n}`;
                return (
                  <div key={k} className="mb-2">
                    <label className="text-[10px] text-muted-foreground">Sugestão {n}</label>
                    <Input value={config[k] ?? ""} onChange={(e) => setConfig((p) => ({ ...p, [k]: e.target.value }))} />
                    <Button size="sm" variant="ghost" onClick={() => saveConfig(k)} className="mt-1 text-xs">Salvar</Button>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-card p-3 text-center">
                <ThumbsUp className="mx-auto h-4 w-4 text-primary" />
                <p className="mt-1 font-display text-xl font-bold">{chatStats.up}</p>
                <p className="text-[10px] text-muted-foreground">Positivos</p>
              </div>
              <div className="rounded-xl bg-card p-3 text-center">
                <ThumbsDown className="mx-auto h-4 w-4 text-destructive" />
                <p className="mt-1 font-display text-xl font-bold">{chatStats.down}</p>
                <p className="text-[10px] text-muted-foreground">Negativos</p>
              </div>
              <div className="rounded-xl bg-card p-3 text-center">
                <p className="font-display text-xl font-bold">{chatLogs.length}</p>
                <p className="text-[10px] text-muted-foreground">Perguntas</p>
              </div>
            </div>

            <div className="rounded-xl bg-card p-4">
              <h3 className="mb-2 text-sm font-bold">Mais perguntadas</h3>
              {chatStats.top.length === 0 && <p className="text-xs text-muted-foreground">Sem dados ainda.</p>}
              {chatStats.top.map((t, i) => (
                <div key={i} className="flex justify-between border-b border-border py-1.5 text-xs last:border-0">
                  <span className="truncate pr-2">{t.q}</span>
                  <span className="font-bold text-primary">{t.n}x</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-card p-4">
              <h3 className="mb-2 text-sm font-bold">Logs anônimos</h3>
              <div className="max-h-96 space-y-1 overflow-y-auto">
                {chatLogs.map((l) => (
                  <div key={l.id} className="border-b border-border py-1.5 text-xs last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</span>
                      <span>{l.feedback === "positivo" ? "👍" : l.feedback === "negativo" ? "👎" : ""}</span>
                    </div>
                    <p className="mt-0.5">{l.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "config" && (
          <div className="space-y-5">
            {Object.entries(config).map(([k, v]) => (
              <div key={k}>
                <label className="text-xs text-muted-foreground">{k}</label>
                {k.startsWith("sistema_prompt") || k === "let_system_prompt" || k.startsWith("mensagem") ? (
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
