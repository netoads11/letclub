import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  Users, Target, UtensilsCrossed, Trophy, Settings, Award, MessageCircle, Bot, Pin,
  Trash2, AlertTriangle, Send, ThumbsUp, ThumbsDown, Plus, X, KeyRound, Eye, LogOut,
  LayoutDashboard, Search, TrendingUp, Activity, Flame, Clock, Filter, GripVertical,
  ChevronRight, BarChart3, Upload, ImagePlus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

type Tab = "dash" | "alunas" | "missoes" | "receitas" | "badges" | "comunidade" | "chat" | "config";

const NAV: { v: Tab; l: string; i: any }[] = [
  { v: "dash", l: "Dashboard", i: LayoutDashboard },
  { v: "alunas", l: "Alunas", i: Users },
  { v: "missoes", l: "Missões", i: Target },
  { v: "receitas", l: "Receitas", i: UtensilsCrossed },
  { v: "badges", l: "Badges", i: Award },
  { v: "comunidade", l: "Comunidade", i: MessageCircle },
  { v: "chat", l: "Chat IA", i: Bot },
  { v: "config", l: "Config", i: Settings },
];

const TIPO_COLORS: Record<string, string> = {
  cafe: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  almoco: "bg-green-500/20 text-green-400 border-green-500/30",
  lanche: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  jantar: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  cha: "bg-teal-500/20 text-teal-400 border-teal-500/30",
};

const timeAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

export default function Admin() {
  const { isAdmin, signOut, user } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("dash");
  const [loading, setLoading] = useState(false);

  // Dashboard
  const [stats, setStats] = useState<any>({ total: 0, ativas: 0, pct: 0, xpAvg: 0, topXp: [] });
  const [dropoff, setDropoff] = useState<{ dia: string; abandono: number }[]>([]);
  const [recentCheckins, setRecentCheckins] = useState<any[]>([]);

  // Alunas
  const [alunas, setAlunas] = useState<any[]>([]);
  const [alunaSearch, setAlunaSearch] = useState("");
  const [alunaFilter, setAlunaFilter] = useState<"all" | "ativa" | "concluida" | "inativa">("all");
  const [alunaSort, setAlunaSort] = useState<{ k: string; dir: "asc" | "desc" }>({ k: "created_at", dir: "desc" });

  // Missions
  const [missions, setMissions] = useState<any[]>([]);
  const [editingMission, setEditingMission] = useState<any | null>(null);

  // Receitas
  const [receitas, setReceitas] = useState<any[]>([]);
  const [editingReceita, setEditingReceita] = useState<any | null>(null);
  const [receitaFilter, setReceitaFilter] = useState<{ tipo: string; dia: string; restricao: string }>({ tipo: "", dia: "", restricao: "" });

  // Aluna detail
  const [alunaDetail, setAlunaDetail] = useState<any | null>(null);
  const [alunaDetailData, setAlunaDetailData] = useState<{ checkins: any[]; pesos: any[]; badges: any[] }>({ checkins: [], pesos: [], badges: [] });

  // Badges
  const [badges, setBadges] = useState<any[]>([]);
  const [badgeUnlocks, setBadgeUnlocks] = useState<Record<string, any[]>>({});
  const [editingBadge, setEditingBadge] = useState<any | null>(null);

  // Comunidade
  const [posts, setPosts] = useState<any[]>([]);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastText, setBroadcastText] = useState("");

  // Chat IA
  const [chatLogs, setChatLogs] = useState<any[]>([]);
  const [chatStats, setChatStats] = useState<{ up: number; down: number; top: { q: string; n: number }[] }>({ up: 0, down: 0, top: [] });

  // Config
  const [config, setConfig] = useState<Record<string, string>>({});

  // Confirmation
  const [confirm, setConfirm] = useState<{ open: boolean; title: string; desc: string; onOk: () => void }>({ open: false, title: "", desc: "", onOk: () => {} });
  const askConfirm = (title: string, desc: string, onOk: () => void) => setConfirm({ open: true, title, desc, onOk });

  useEffect(() => {
    if (!isAdmin) return;
    loadTab();
  }, [tab, isAdmin]);

  const loadTab = async () => {
    setLoading(true);
    try {
      if (tab === "dash") {
        const [profs, today, allCheckins, recent] = await Promise.all([
          supabase.from("profiles").select("*").order("created_at", { ascending: false }),
          supabase.from("checkins").select("user_id").gte("completed_at", new Date().toISOString().slice(0, 10)),
          supabase.from("checkins").select("user_id, dia_numero"),
          supabase.from("checkins").select("*, missions:mission_id(titulo), profiles:user_id(full_name, email)").order("completed_at", { ascending: false }).limit(10),
        ]);
        const list = profs.data ?? [];
        const ativasIds = new Set((today.data ?? []).map((c: any) => c.user_id));
        const xpAvg = list.length ? Math.round(list.reduce((a: number, b: any) => a + (b.xp_total ?? 0), 0) / list.length) : 0;
        setStats({
          total: list.length,
          ativas: ativasIds.size,
          pct: list.length ? Math.round((ativasIds.size / list.length) * 100) : 0,
          xpAvg,
          topXp: [...list].sort((a: any, b: any) => (b.xp_total ?? 0) - (a.xp_total ?? 0)).slice(0, 10),
        });
        setRecentCheckins(recent.data ?? []);

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
            if ((maxDayPerUser[u.id] ?? 0) === d) n++;
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
          .from("chat_messages").select("id, content, feedback, created_at, role")
          .eq("role", "user").order("created_at", { ascending: false }).limit(200);
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
        const top = Object.entries(counts).map(([q, n]) => ({ q, n })).sort((a, b) => b.n - a.n).slice(0, 8);
        setChatStats({ up, down, top });
      }
      if (tab === "config" || tab === "chat") {
        const { data } = await supabase.from("configuracoes_app").select("chave, valor");
        const map: Record<string, string> = {};
        (data ?? []).forEach((x: any) => (map[x.chave] = x.valor));
        setConfig(map);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Acesso restrito</div>;

  // ================ Helpers ================
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

  const saveBadge = async (b: any) => {
    if (b.id) {
      const { error } = await supabase.from("badges").update({
        nome: b.nome, descricao: b.descricao, icone: b.icone, xp_reward: Number(b.xp_reward) || 0, ativo: b.ativo,
      }).eq("id", b.id);
      if (error) return toast.error(error.message);
    } else {
      const slug = (b.nome || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40);
      const { error } = await supabase.from("badges").insert({
        slug, nome: b.nome, descricao: b.descricao || "", icone: b.icone || "🏆",
        xp_reward: Number(b.xp_reward) || 0, ativo: b.ativo ?? true,
      });
      if (error) return toast.error(error.message);
    }
    toast.success("Badge salva");
    setEditingBadge(null);
    loadTab();
  };

  const deleteBadge = (id: string) => askConfirm("Excluir badge?", "Esta ação não pode ser desfeita.", async () => {
    const { error } = await supabase.from("badges").delete().eq("id", id);
    if (error) return toast.error(error.message);
    loadTab();
  });

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

  const deleteReceita = (id: string) => askConfirm("Excluir receita?", "Esta ação não pode ser desfeita.", async () => {
    const { error } = await supabase.from("receitas").delete().eq("id", id);
    if (error) return toast.error(error.message);
    loadTab();
  });

  // Missions CRUD
  const newMission = (dia: number) => setEditingMission({
    dia_numero: dia, titulo: "", descricao_curta: "", descricao_completa: "",
    icone: "✨", xp_reward: 10, ordem: 0, ativo: true, video_url: "",
  });

  const saveMission = async (m: any) => {
    if (!m.titulo) return toast.error("Título obrigatório");
    const payload = {
      dia_numero: Number(m.dia_numero), titulo: m.titulo, descricao_curta: m.descricao_curta ?? "",
      descricao_completa: m.descricao_completa ?? "", icone: m.icone || "✨",
      xp_reward: Number(m.xp_reward) || 10, ordem: Number(m.ordem) || 0,
      ativo: m.ativo ?? true, video_url: m.video_url || null,
    };
    if (m.id) {
      const { error } = await supabase.from("missions").update(payload).eq("id", m.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("missions").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success("Missão salva");
    setEditingMission(null);
    loadTab();
  };

  const deleteMission = (id: string) => askConfirm("Excluir missão?", "Esta ação não pode ser desfeita.", async () => {
    const { error } = await supabase.from("missions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    loadTab();
  });

  const toggleMissionAtivo = async (id: string, cur: boolean) => {
    await supabase.from("missions").update({ ativo: !cur }).eq("id", id);
    setMissions((p) => p.map((m) => (m.id === id ? { ...m, ativo: !cur } : m)));
  };

  const openAlunaDetail = async (a: any) => {
    setAlunaDetail(a);
    const [ckRes, psRes, ubRes] = await Promise.all([
      supabase.from("checkins").select("*, missions:mission_id(titulo, dia_numero)").eq("user_id", a.id).order("completed_at", { ascending: false }),
      supabase.from("pesos_historico").select("*").eq("user_id", a.id).order("registrado_em", { ascending: true }),
      supabase.from("user_badges").select("*, badges:badge_id(nome, icone)").eq("user_id", a.id),
    ]);
    setAlunaDetailData({ checkins: ckRes.data ?? [], pesos: psRes.data ?? [], badges: ubRes.data ?? [] });
  };

  const resetSenha = async (email: string) => {
    if (!email) return toast.error("Sem email");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success(`Email de reset enviado para ${email}`);
  };

  const alunaStatus = (a: any): { label: string; cls: string; key: string } => {
    if (a.bloqueado) return { label: "Inativa", cls: "bg-muted text-muted-foreground border-border", key: "inativa" };
    const start = a.challenge_start_date ? new Date(a.challenge_start_date) : null;
    if (!start) return { label: "Inativa", cls: "bg-muted text-muted-foreground border-border", key: "inativa" };
    const diff = Math.floor((Date.now() - start.getTime()) / 86400000) + 1;
    if (diff > 15) return { label: "Concluída", cls: "bg-blue-500/20 text-blue-400 border-blue-500/30", key: "concluida" };
    return { label: "Ativa", cls: "bg-green-500/20 text-green-400 border-green-500/30", key: "ativa" };
  };

  const alunaDia = (a: any): number => {
    if (!a.challenge_start_date) return 0;
    const start = new Date(a.challenge_start_date);
    return Math.min(15, Math.floor((Date.now() - start.getTime()) / 86400000) + 1);
  };

  const removePost = (id: string) => askConfirm("Remover post?", "O post será ocultado da comunidade.", async () => {
    await supabase.from("posts_comunidade").update({ removido: true }).eq("id", id);
    setPosts((p) => p.map((x) => (x.id === id ? { ...x, removido: true } : x)));
    toast.success("Post removido");
  });

  const markReviewed = async (id: string) => {
    await supabase.from("posts_comunidade").update({ reportado: false }).eq("id", id);
    setPosts((p) => p.map((x) => (x.id === id ? { ...x, reportado: false } : x)));
    toast.success("Marcado como revisado");
  };

  const togglePin = async (id: string, cur: boolean) => {
    await supabase.from("posts_comunidade").update({ fixado: !cur }).eq("id", id);
    setPosts((p) => p.map((x) => (x.id === id ? { ...x, fixado: !cur } : x)));
  };

  const broadcast = async () => {
    if (!broadcastText.trim()) return toast.error("Escreva uma mensagem");
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    const { error: postErr } = await supabase.from("posts_comunidade").insert({
      user_id: u.id, texto: broadcastText, fixado: true,
    });
    if (postErr) return toast.error(postErr.message);
    const { data: users } = await supabase.from("profiles").select("id");
    if (users?.length) {
      const rows = users.map((u: any) => ({
        user_id: u.id, tipo: "sistema" as const, titulo: "Comunicado da Let", mensagem: broadcastText,
      }));
      for (let i = 0; i < rows.length; i += 100) {
        await supabase.from("notificacoes").insert(rows.slice(i, i + 100));
      }
    }
    toast.success("Comunicado enviado e fixado");
    setBroadcastText("");
    setBroadcastOpen(false);
    loadTab();
  };

  // ================ Derived ================
  const filteredAlunas = useMemo(() => {
    let f = alunas.filter((a) => {
      if (alunaSearch) {
        const s = alunaSearch.toLowerCase();
        if (!(a.full_name ?? "").toLowerCase().includes(s) && !(a.email ?? "").toLowerCase().includes(s)) return false;
      }
      if (alunaFilter !== "all") {
        if (alunaStatus(a).key !== alunaFilter) return false;
      }
      return true;
    });
    f = [...f].sort((a, b) => {
      const va = a[alunaSort.k] ?? 0;
      const vb = b[alunaSort.k] ?? 0;
      if (typeof va === "string") return alunaSort.dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return alunaSort.dir === "asc" ? va - vb : vb - va;
    });
    return f;
  }, [alunas, alunaSearch, alunaFilter, alunaSort]);

  const filteredReceitas = useMemo(() => {
    return receitas.filter((r) => {
      if (receitaFilter.tipo && r.tipo_refeicao !== receitaFilter.tipo) return false;
      if (receitaFilter.dia && String(r.dia_numero ?? "") !== receitaFilter.dia) return false;
      if (receitaFilter.restricao && !(r.restricoes_compativeis ?? []).includes(receitaFilter.restricao)) return false;
      return true;
    });
  }, [receitas, receitaFilter]);

  const missionsByDay = useMemo(() => {
    const map: Record<number, any[]> = {};
    for (let d = 1; d <= 15; d++) map[d] = [];
    missions.forEach((m) => {
      if (!map[m.dia_numero]) map[m.dia_numero] = [];
      map[m.dia_numero].push(m);
    });
    return map;
  }, [missions]);

  const maxXp = Math.max(1, ...stats.topXp.map((x: any) => x.xp_total ?? 0));

  const sortBy = (k: string) => setAlunaSort((p) => ({ k, dir: p.k === k && p.dir === "asc" ? "desc" : "asc" }));

  // ================ UI ================
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden w-[220px] shrink-0 flex-col border-r border-[#2A2A2A] bg-[#0D0D0D] md:flex">
        <div className="border-b border-[#2A2A2A] px-5 py-5">
          <p className="font-display text-lg font-bold tracking-tight">LET&PONTO</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Admin Console</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((n) => {
            const active = tab === n.v;
            return (
              <button
                key={n.v}
                onClick={() => setTab(n.v)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-[#1A1A1A] hover:text-foreground"
                }`}
              >
                <n.i className="h-4 w-4" />
                {n.l}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-[#2A2A2A] p-3">
          <Button variant="ghost" size="sm" onClick={() => nav("/home")} className="w-full justify-start text-xs text-muted-foreground">
            ← Voltar ao app
          </Button>
        </div>
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 border-b border-[#2A2A2A] bg-[#0D0D0D]">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="font-display text-sm font-bold">LET&PONTO Admin</p>
          <Button size="sm" variant="ghost" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
        </div>
        <div className="scrollbar-hide flex gap-1.5 overflow-x-auto px-3 pb-3">
          {NAV.map((n) => (
            <button key={n.v} onClick={() => setTab(n.v)} className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] ${tab === n.v ? "bg-primary text-primary-foreground" : "bg-[#1A1A1A] text-muted-foreground"}`}>
              <n.i className="h-3 w-3" />{n.l}
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 pt-[88px] md:pt-0">
        {/* Topbar (desktop) */}
        <header className="hidden md:flex items-center justify-between border-b border-[#2A2A2A] bg-[#0D0D0D] px-8 py-4">
          <div>
            <h1 className="font-display text-xl font-bold">{NAV.find((n) => n.v === tab)?.l}</h1>
            <p className="text-xs text-muted-foreground">Painel administrativo LET&PONTO</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-medium">{user?.email}</p>
              <p className="text-[10px] text-muted-foreground">Administrador</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-primary/20 grid place-items-center text-primary font-bold text-sm">
              {(user?.email ?? "A").charAt(0).toUpperCase()}
            </div>
            <Button size="sm" variant="ghost" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
          </div>
        </header>

        <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-6 md:py-8">

          {/* ============== DASHBOARD ============== */}
          {tab === "dash" && (
            <div className="space-y-6">
              {/* KPI cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Alunas", value: stats.total, icon: Users, trend: "+12%" },
                  { label: "Ativas Hoje", value: stats.ativas, icon: Activity, trend: `${stats.pct}%` },
                  { label: "Taxa de Conclusão", value: `${stats.pct}%`, icon: TrendingUp, trend: "" },
                  { label: "XP Médio", value: stats.xpAvg, icon: Trophy, trend: "" },
                ].map((k, i) => (
                  <div key={i} className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-5 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
                        <p className="mt-2 font-display text-3xl font-bold">{loading ? <Skeleton className="h-8 w-16" /> : k.value}</p>
                      </div>
                      <div className="rounded-lg bg-primary/10 p-2">
                        <k.icon className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    {k.trend && <p className="mt-2 text-[11px] text-primary">↗ {k.trend}</p>}
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-base font-bold">Abandono por dia</h3>
                    <p className="text-xs text-muted-foreground">Alunas que pararam de fazer check-in após cada dia</p>
                  </div>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer>
                    <LineChart data={dropoff} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                      <XAxis dataKey="dia" stroke="#888" fontSize={11} label={{ value: "Dia do desafio", position: "insideBottom", offset: -2, fontSize: 10, fill: "#888" }} />
                      <YAxis allowDecimals={false} stroke="#888" fontSize={11} label={{ value: "Alunas", angle: -90, position: "insideLeft", fontSize: 10, fill: "#888" }} />
                      <Tooltip contentStyle={{ background: "#0D0D0D", border: "1px solid #2A2A2A", borderRadius: 8, fontSize: 12 }} />
                      <Line type="monotone" dataKey="abandono" stroke="#CDFF00" strokeWidth={2.5} dot={{ r: 4, fill: "#CDFF00" }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                {/* Top XP */}
                <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-6">
                  <h3 className="mb-4 font-display text-base font-bold">Top 10 por XP</h3>
                  <div className="space-y-2.5">
                    {stats.topXp.map((a: any, i: number) => (
                      <div key={a.id} className="flex items-center gap-3">
                        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md text-xs font-bold ${i < 3 ? "bg-primary/20 text-primary" : "bg-[#1A1A1A] text-muted-foreground"}`}>{i + 1}</span>
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {(a.full_name || a.email || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="truncate font-medium">{a.full_name || a.email}</span>
                            <span className="ml-2 shrink-0 text-primary font-bold">{a.xp_total} XP</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#1A1A1A]">
                            <div className="h-full bg-primary transition-all" style={{ width: `${((a.xp_total ?? 0) / maxXp) * 100}%` }} />
                          </div>
                        </div>
                        {(a.streak_atual ?? 0) > 0 && (
                          <span className="flex shrink-0 items-center gap-0.5 rounded-md bg-orange-500/10 px-1.5 py-0.5 text-[10px] text-orange-400">
                            <Flame className="h-2.5 w-2.5" />{a.streak_atual}
                          </span>
                        )}
                      </div>
                    ))}
                    {stats.topXp.length === 0 && !loading && (
                      <p className="py-6 text-center text-xs text-muted-foreground">Nenhuma aluna ainda.</p>
                    )}
                  </div>
                </div>

                {/* Recent check-ins */}
                <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-6">
                  <h3 className="mb-4 font-display text-base font-bold">Últimos check-ins</h3>
                  <div className="space-y-3">
                    {recentCheckins.map((c) => (
                      <div key={c.id} className="flex items-center gap-3">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {(c.profiles?.full_name || c.profiles?.email || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{c.profiles?.full_name || c.profiles?.email}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{c.missions?.titulo}</p>
                        </div>
                        <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />{timeAgo(c.completed_at)}
                        </span>
                      </div>
                    ))}
                    {recentCheckins.length === 0 && !loading && (
                      <p className="py-6 text-center text-xs text-muted-foreground">Nenhum check-in ainda.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============== ALUNAS ============== */}
          {tab === "alunas" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={alunaSearch} onChange={(e) => setAlunaSearch(e.target.value)} placeholder="Buscar por nome ou email..." className="pl-9 bg-[#141414] border-[#2A2A2A]" />
                </div>
                <div className="flex gap-2">
                  {(["all", "ativa", "concluida", "inativa"] as const).map((f) => (
                    <button key={f} onClick={() => setAlunaFilter(f)}
                      className={`rounded-md border px-3 py-2 text-xs font-medium capitalize transition ${alunaFilter === f ? "border-primary bg-primary/10 text-primary" : "border-[#2A2A2A] bg-[#141414] text-muted-foreground hover:text-foreground"}`}>
                      {f === "all" ? "Todas" : f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#141414]">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-[#2A2A2A] bg-[#0D0D0D] text-[11px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        {[
                          { k: "full_name", l: "Nome" }, { k: "email", l: "Email" }, { k: "challenge_start_date", l: "Dia" },
                          { k: "xp_total", l: "XP" }, { k: "streak_atual", l: "Streak" }, { k: "_status", l: "Status" },
                          { k: "ultimo_checkin", l: "Último check-in" },
                        ].map((c) => (
                          <th key={c.k} className="px-4 py-3 text-left font-medium">
                            <button className="flex items-center gap-1 hover:text-foreground" onClick={() => sortBy(c.k)}>
                              {c.l}
                              {alunaSort.k === c.k && <span>{alunaSort.dir === "asc" ? "↑" : "↓"}</span>}
                            </button>
                          </th>
                        ))}
                        <th className="px-4 py-3 text-right font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b border-[#1A1A1A]"><td colSpan={8} className="p-3"><Skeleton className="h-8 w-full" /></td></tr>
                      ))}
                      {!loading && filteredAlunas.map((a, i) => {
                        const st = alunaStatus(a);
                        return (
                          <tr key={a.id} className={`border-b border-[#1A1A1A] hover:bg-[#1A1A1A] transition-colors ${i % 2 ? "bg-[#161616]" : ""}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                  {(a.full_name || a.email || "?").charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium">{a.full_name || "—"}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{a.email}</td>
                            <td className="px-4 py-3 text-xs">{alunaDia(a)}/15</td>
                            <td className="px-4 py-3 font-bold text-primary">{a.xp_total ?? 0}</td>
                            <td className="px-4 py-3">
                              {(a.streak_atual ?? 0) > 0 ? (
                                <span className="flex w-fit items-center gap-1 rounded-md bg-orange-500/10 px-1.5 py-0.5 text-[11px] text-orange-400">
                                  <Flame className="h-3 w-3" />{a.streak_atual}
                                </span>
                              ) : <span className="text-xs text-muted-foreground">0</span>}
                            </td>
                            <td className="px-4 py-3"><span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${st.cls}`}>{st.label}</span></td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{a.ultimo_checkin ?? "—"}</td>
                            <td className="px-4 py-3 text-right">
                              <Button size="sm" variant="ghost" onClick={() => openAlunaDetail(a)}>
                                <Eye className="mr-1 h-3.5 w-3.5" />Ver
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                      {!loading && filteredAlunas.length === 0 && (
                        <tr><td colSpan={8} className="p-12 text-center">
                          <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">Nenhuma aluna encontrada</p>
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============== MISSÕES ============== */}
          {tab === "missoes" && (
            <div className="space-y-4">
              <Accordion type="multiple" defaultValue={["1"]} className="space-y-2">
                {Array.from({ length: 15 }).map((_, idx) => {
                  const d = idx + 1;
                  const list = missionsByDay[d] ?? [];
                  return (
                    <AccordionItem key={d} value={String(d)} className="rounded-xl border border-[#2A2A2A] bg-[#141414] px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 font-display text-sm font-bold text-primary">D{d}</span>
                          <span className="font-medium">Dia {d}</span>
                          <span className="text-xs text-muted-foreground">{list.length} missões</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pb-2">
                          {list.map((m) => (
                            <div key={m.id} className="flex items-center gap-3 rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-3">
                              <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                              <span className="grid h-7 w-7 place-items-center rounded-md bg-[#1A1A1A] text-xs font-bold">{m.ordem}</span>
                              <span className="text-xl">{m.icone}</span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{m.titulo}</p>
                                <p className="truncate text-[11px] text-muted-foreground">{m.descricao_curta}</p>
                              </div>
                              <Badge variant="outline" className="border-primary/30 text-primary">+{m.xp_reward} XP</Badge>
                              <Switch checked={m.ativo} onCheckedChange={() => toggleMissionAtivo(m.id, m.ativo)} />
                              <Button size="sm" variant="ghost" onClick={() => setEditingMission(m)}>Editar</Button>
                              <Button size="sm" variant="ghost" onClick={() => deleteMission(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          ))}
                          <Button size="sm" variant="outline" onClick={() => newMission(d)} className="w-full border-dashed border-[#2A2A2A]">
                            <Plus className="mr-1 h-3.5 w-3.5" /> Nova missão para Dia {d}
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          )}

          {/* ============== RECEITAS ============== */}
          {tab === "receitas" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <select className="h-9 rounded-md border border-[#2A2A2A] bg-[#141414] px-2.5 text-xs" value={receitaFilter.tipo} onChange={(e) => setReceitaFilter({ ...receitaFilter, tipo: e.target.value })}>
                    <option value="">Todos os tipos</option>
                    <option value="cafe">Café</option><option value="almoco">Almoço</option>
                    <option value="lanche">Lanche</option><option value="jantar">Jantar</option><option value="cha">Chá</option>
                  </select>
                  <select className="h-9 rounded-md border border-[#2A2A2A] bg-[#141414] px-2.5 text-xs" value={receitaFilter.dia} onChange={(e) => setReceitaFilter({ ...receitaFilter, dia: e.target.value })}>
                    <option value="">Todos os dias</option>
                    {Array.from({ length: 15 }).map((_, i) => <option key={i + 1} value={String(i + 1)}>Dia {i + 1}</option>)}
                  </select>
                  <select className="h-9 rounded-md border border-[#2A2A2A] bg-[#141414] px-2.5 text-xs" value={receitaFilter.restricao} onChange={(e) => setReceitaFilter({ ...receitaFilter, restricao: e.target.value })}>
                    <option value="">Todas restrições</option>
                    {["vegetariana", "lactose", "gluten", "gestante"].map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <Button onClick={newReceita} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="mr-1 h-4 w-4" /> Nova receita
                </Button>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredReceitas.map((r) => (
                  <div key={r.id} className="group overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#141414] transition hover:border-primary/40">
                    <div className="relative h-32 bg-gradient-to-br from-primary/20 via-purple-500/10 to-orange-500/20">
                      {r.imagem_url ? <img src={r.imagem_url} alt={r.nome} className="h-full w-full object-cover" /> :
                        <div className="grid h-full w-full place-items-center text-3xl opacity-30">🍽️</div>}
                      <div className="absolute inset-0 bg-black/60 opacity-0 transition group-hover:opacity-100 grid place-items-center gap-2">
                        <Button size="sm" onClick={() => setEditingReceita(r)} className="bg-primary text-primary-foreground">Editar</Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteReceita(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                      <span className={`absolute top-2 left-2 rounded-md border px-2 py-0.5 text-[10px] font-medium ${TIPO_COLORS[r.tipo_refeicao] ?? "bg-muted"}`}>
                        {r.tipo_refeicao}
                      </span>
                      {r.dia_numero && <span className="absolute top-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold">D{r.dia_numero}</span>}
                    </div>
                    <div className="p-4">
                      <p className="font-medium truncate">{r.nome}</p>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{r.tempo_preparo}min</span>
                        <div className="flex gap-1">
                          {(r.restricoes_compativeis ?? []).map((x: string) => (
                            <span key={x} className="rounded bg-[#1A1A1A] px-1.5 py-0.5 text-[9px]">{x.slice(0, 3)}</span>
                          ))}
                        </div>
                      </div>
                      {!r.ativo && <p className="mt-1 text-[10px] text-muted-foreground">(inativa)</p>}
                    </div>
                  </div>
                ))}
                {filteredReceitas.length === 0 && !loading && (
                  <div className="col-span-full rounded-xl border border-dashed border-[#2A2A2A] bg-[#141414] p-12 text-center">
                    <UtensilsCrossed className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Nenhuma receita encontrada</p>
                    <Button size="sm" onClick={newReceita} className="mt-3 bg-primary text-primary-foreground">+ Nova receita</Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============== BADGES ============== */}
          {tab === "badges" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setEditingBadge({ nome: "", descricao: "", icone: "🏆", xp_reward: 10, ativo: true })} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="mr-1 h-4 w-4" /> Nova badge
                </Button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {badges.map((b) => (
                  <div key={b.id} className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-5 hover:border-primary/40 transition">
                    <div className="flex items-start justify-between">
                      <div className="text-5xl">{b.icone}</div>
                      <Switch checked={b.ativo} onCheckedChange={async (v) => { await supabase.from("badges").update({ ativo: v }).eq("id", b.id); loadTab(); }} />
                    </div>
                    <h3 className="mt-3 font-display font-bold">{b.nome}</h3>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{b.descricao}</p>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <Badge variant="outline" className="border-primary/30 text-primary">+{b.xp_reward} XP</Badge>
                      <span className="text-muted-foreground">{(badgeUnlocks[b.id] ?? []).length} alunas</span>
                    </div>
                    <div className="mt-3 flex gap-1.5 border-t border-[#2A2A2A] pt-3">
                      <Button size="sm" variant="outline" onClick={() => setEditingBadge(b)} className="flex-1">Editar</Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteBadge(b.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                ))}
                {badges.length === 0 && !loading && (
                  <div className="col-span-full rounded-xl border border-dashed border-[#2A2A2A] bg-[#141414] p-12 text-center">
                    <Award className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Nenhuma badge ainda</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============== COMUNIDADE ============== */}
          {tab === "comunidade" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setBroadcastOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Send className="mr-2 h-4 w-4" /> Novo comunicado
                </Button>
              </div>
              <div className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-2">
                  <h3 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">Feed completo</h3>
                  {posts.filter((p) => !p.removido).map((p) => (
                    <PostCard key={p.id} p={p} onRemove={removePost} onPin={togglePin} onReviewed={markReviewed} />
                  ))}
                  {posts.filter((p) => !p.removido).length === 0 && !loading && (
                    <div className="rounded-xl border border-dashed border-[#2A2A2A] p-8 text-center text-sm text-muted-foreground">Sem posts.</div>
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="font-display text-sm font-bold uppercase tracking-wide text-destructive">Reportados</h3>
                  {posts.filter((p) => p.reportado && !p.removido).map((p) => (
                    <PostCard key={p.id} p={p} onRemove={removePost} onPin={togglePin} onReviewed={markReviewed} compact />
                  ))}
                  {posts.filter((p) => p.reportado && !p.removido).length === 0 && (
                    <div className="rounded-xl border border-dashed border-[#2A2A2A] p-6 text-center text-xs text-muted-foreground">Nenhum reporte pendente ✨</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============== CHAT IA ============== */}
          {tab === "chat" && (
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-5">
                  <h3 className="mb-1 font-display font-bold">System prompt da Let</h3>
                  <p className="mb-3 text-xs text-muted-foreground">Define a personalidade e diretrizes da assistente IA.</p>
                  <Textarea
                    value={config.sistema_prompt_let ?? ""}
                    onChange={(e) => setConfig((p) => ({ ...p, sistema_prompt_let: e.target.value }))}
                    className="min-h-[200px] font-mono text-xs bg-[#0D0D0D] border-[#2A2A2A]"
                  />
                  <Button size="sm" onClick={() => saveConfig("sistema_prompt_let", config.sistema_prompt_let)} className="mt-3 bg-primary text-primary-foreground">Salvar prompt</Button>
                </div>
                <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-5">
                  <h3 className="mb-3 font-display font-bold">Sugestões rápidas</h3>
                  {[1, 2, 3].map((n) => {
                    const k = `sugestoes_chat_${n}`;
                    return (
                      <div key={k} className="mb-3 flex gap-2">
                        <Input value={config[k] ?? ""} onChange={(e) => setConfig((p) => ({ ...p, [k]: e.target.value }))} placeholder={`Chip ${n}`} className="bg-[#0D0D0D] border-[#2A2A2A]" />
                        <Button size="sm" variant="outline" onClick={() => saveConfig(k)}>Salvar</Button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-4 text-center">
                    <ThumbsUp className="mx-auto h-4 w-4 text-primary" />
                    <p className="mt-2 font-display text-2xl font-bold">{chatStats.up}</p>
                    <p className="text-[10px] text-muted-foreground">Positivos</p>
                  </div>
                  <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-4 text-center">
                    <ThumbsDown className="mx-auto h-4 w-4 text-destructive" />
                    <p className="mt-2 font-display text-2xl font-bold">{chatStats.down}</p>
                    <p className="text-[10px] text-muted-foreground">Negativos</p>
                  </div>
                  <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-4 text-center">
                    <MessageCircle className="mx-auto h-4 w-4 text-muted-foreground" />
                    <p className="mt-2 font-display text-2xl font-bold">{chatLogs.length}</p>
                    <p className="text-[10px] text-muted-foreground">Conversas</p>
                  </div>
                </div>

                <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-5">
                  <h3 className="mb-3 font-display font-bold">Mais perguntadas</h3>
                  {chatStats.top.length === 0 ? <p className="text-xs text-muted-foreground">Sem dados ainda.</p> : chatStats.top.map((t, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-[#1A1A1A] py-2 last:border-0">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-xs text-muted-foreground">#{i + 1}</span>
                        <span className="truncate text-xs">{t.q}</span>
                      </div>
                      <Badge variant="outline" className="border-primary/30 text-primary">{t.n}x</Badge>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-5">
                  <h3 className="mb-3 font-display font-bold">Logs recentes</h3>
                  <div className="max-h-80 space-y-2 overflow-y-auto">
                    {chatLogs.slice(0, 30).map((l) => (
                      <div key={l.id} className="rounded-lg bg-[#0D0D0D] p-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</span>
                          <span>{l.feedback === "positivo" ? "👍" : l.feedback === "negativo" ? "👎" : ""}</span>
                        </div>
                        <p className="mt-1">{l.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============== CONFIG ============== */}
          {tab === "config" && (
            <div className="max-w-3xl space-y-8">
              {/* ====== Conteúdo ====== */}
              <section>
                <h2 className="mb-1 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">Conteúdo</h2>
                <p className="mb-4 text-xs text-muted-foreground">Textos e mensagens exibidos para as alunas no app.</p>
                <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">Mensagem motivacional da Let</p>
                      <p className="text-[11px] text-muted-foreground">Texto exibido na tela inicial (Home) abaixo do nome da aluna. Use para inspirar e dar boas-vindas.</p>
                    </div>
                    <Button size="sm" onClick={() => saveConfig("mensagem_let_home")} className="bg-primary text-primary-foreground">Salvar</Button>
                  </div>
                  <Textarea
                    value={config.mensagem_let_home ?? ""}
                    onChange={(e) => setConfig((p) => ({ ...p, mensagem_let_home: e.target.value }))}
                    placeholder="Ex: Bom dia, guerreira! Hoje é mais um dia para brilhar 💚"
                    className="min-h-[90px] bg-[#0D0D0D] border-[#2A2A2A]"
                  />
                </div>
              </section>

              {/* ====== Notificações ====== */}
              <section>
                <h2 className="mb-1 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">Notificações</h2>
                <p className="mb-4 text-xs text-muted-foreground">Horários em que os lembretes automáticos são disparados para as alunas.</p>
                <div className="space-y-3">
                  <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-sm">Horário do lembrete diário</p>
                        <p className="text-[11px] text-muted-foreground">Hora em que cada aluna recebe a notificação diária para abrir o app e cumprir as missões do dia.</p>
                      </div>
                      <Button size="sm" onClick={() => saveConfig("horario_lembrete_diario", config.horario_lembrete_diario ?? "07:00")} className="bg-primary text-primary-foreground">Salvar</Button>
                    </div>
                    <Input
                      type="time"
                      value={config.horario_lembrete_diario ?? "07:00"}
                      onChange={(e) => setConfig((p) => ({ ...p, horario_lembrete_diario: e.target.value }))}
                      className="w-40 bg-[#0D0D0D] border-[#2A2A2A]"
                    />
                  </div>

                  <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-sm">Horário do alerta "streak em risco"</p>
                        <p className="text-[11px] text-muted-foreground">No fim do dia, alunas que ainda não fizeram check-in recebem um aviso para não perder a sequência.</p>
                      </div>
                      <Button size="sm" onClick={() => saveConfig("horario_streak_risco", config.horario_streak_risco ?? "20:00")} className="bg-primary text-primary-foreground">Salvar</Button>
                    </div>
                    <Input
                      type="time"
                      value={config.horario_streak_risco ?? "20:00"}
                      onChange={(e) => setConfig((p) => ({ ...p, horario_streak_risco: e.target.value }))}
                      className="w-40 bg-[#0D0D0D] border-[#2A2A2A]"
                    />
                  </div>
                </div>
              </section>

              <p className="text-[11px] text-muted-foreground">
                💡 As configurações da assistente IA (prompt + sugestões) ficam na aba <span className="text-primary">Chat IA</span>.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* ===== Aluna detail drawer ===== */}
      <Sheet open={!!alunaDetail} onOpenChange={(o) => !o && setAlunaDetail(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto bg-[#0D0D0D] border-[#2A2A2A]">
          <SheetHeader>
            <SheetTitle className="font-display">{alunaDetail?.full_name || alunaDetail?.email}</SheetTitle>
          </SheetHeader>
          {alunaDetail && (
            <div className="mt-5 space-y-5">
              <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-4">
                <div className="grid grid-cols-2 gap-y-2.5 text-xs">
                  <div><span className="text-muted-foreground">Email:</span><br /><span className="font-medium">{alunaDetail.email}</span></div>
                  <div><span className="text-muted-foreground">Status:</span><br /><span className={`rounded-md border px-1.5 py-0.5 text-[10px] ${alunaStatus(alunaDetail).cls}`}>{alunaStatus(alunaDetail).label}</span></div>
                  <div><span className="text-muted-foreground">Dia:</span> <span className="font-bold">{alunaDia(alunaDetail)}/15</span></div>
                  <div><span className="text-muted-foreground">XP:</span> <span className="font-bold text-primary">{alunaDetail.xp_total ?? 0}</span></div>
                  <div><span className="text-muted-foreground">Streak:</span> {alunaDetail.streak_atual ?? 0} (rec. {alunaDetail.streak_recorde ?? 0})</div>
                  <div><span className="text-muted-foreground">Altura:</span> {alunaDetail.altura ?? "—"}</div>
                  <div><span className="text-muted-foreground">Peso:</span> {alunaDetail.peso_atual ?? "—"}kg</div>
                  <div><span className="text-muted-foreground">Meta:</span> {alunaDetail.meta_peso ?? "—"}kg</div>
                </div>
              </div>

              {alunaDetailData.pesos.length > 1 && (
                <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-4">
                  <h4 className="mb-2 text-xs font-bold uppercase text-muted-foreground">Evolução de peso</h4>
                  <div className="h-40">
                    <ResponsiveContainer>
                      <LineChart data={alunaDetailData.pesos.map((p: any) => ({ data: p.registrado_em.slice(5), peso: Number(p.peso) }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                        <XAxis dataKey="data" stroke="#888" fontSize={10} />
                        <YAxis stroke="#888" fontSize={10} domain={["auto", "auto"]} />
                        <Tooltip contentStyle={{ background: "#0D0D0D", border: "1px solid #2A2A2A", fontSize: 11 }} />
                        <Line type="monotone" dataKey="peso" stroke="#CDFF00" strokeWidth={2} dot={{ r: 3, fill: "#CDFF00" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-4">
                <h4 className="mb-2 text-xs font-bold uppercase text-muted-foreground">Badges ({alunaDetailData.badges.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {alunaDetailData.badges.map((b: any) => (
                    <span key={b.id} className="rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-xs">{b.badges?.icone} {b.badges?.nome}</span>
                  ))}
                  {alunaDetailData.badges.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma.</p>}
                </div>
              </div>

              <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-4">
                <h4 className="mb-2 text-xs font-bold uppercase text-muted-foreground">Check-ins ({alunaDetailData.checkins.length})</h4>
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {alunaDetailData.checkins.map((c: any) => (
                    <div key={c.id} className="flex justify-between text-xs">
                      <span><span className="text-muted-foreground">D{c.dia_numero}</span> • {c.missions?.titulo}</span>
                      <span className="text-muted-foreground">{new Date(c.completed_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 border-t border-[#2A2A2A] pt-4">
                <Button size="sm" onClick={() => resetSenha(alunaDetail.email)} className="bg-primary text-primary-foreground">
                  <KeyRound className="mr-1 h-3.5 w-3.5" />Reset senha
                </Button>
                <Button size="sm" variant={alunaDetail.bloqueado ? "outline" : "destructive"} onClick={() => askConfirm(
                  alunaDetail.bloqueado ? "Desbloquear aluna?" : "Bloquear aluna?",
                  "Esta ação afeta o acesso da aluna ao app.",
                  () => { toggleBlock(alunaDetail.id, alunaDetail.bloqueado); setAlunaDetail({ ...alunaDetail, bloqueado: !alunaDetail.bloqueado }); }
                )}>
                  {alunaDetail.bloqueado ? "Desbloquear" : "Bloquear"}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ===== Receita modal ===== */}
      <Dialog open={!!editingReceita} onOpenChange={(o) => !o && setEditingReceita(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-[#141414] border-[#2A2A2A]">
          <DialogHeader>
            <DialogTitle className="font-display">{editingReceita?.id ? "Editar receita" : "Nova receita"}</DialogTitle>
          </DialogHeader>
          {editingReceita && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Nome</label>
                <Input value={editingReceita.nome} onChange={(e) => setEditingReceita({ ...editingReceita, nome: e.target.value })} className="mt-1 bg-[#0D0D0D] border-[#2A2A2A]" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Tipo</label>
                  <select className="mt-1 h-10 w-full rounded-md border border-[#2A2A2A] bg-[#0D0D0D] px-2 text-sm" value={editingReceita.tipo_refeicao} onChange={(e) => setEditingReceita({ ...editingReceita, tipo_refeicao: e.target.value })}>
                    <option value="cafe">Café</option><option value="almoco">Almoço</option><option value="lanche">Lanche</option><option value="jantar">Jantar</option><option value="cha">Chá</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Dia (opcional)</label>
                  <Input type="number" value={editingReceita.dia_numero ?? ""} onChange={(e) => setEditingReceita({ ...editingReceita, dia_numero: e.target.value === "" ? null : e.target.value })} className="mt-1 bg-[#0D0D0D] border-[#2A2A2A]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-muted-foreground">Tempo (min)</label><Input type="number" value={editingReceita.tempo_preparo} onChange={(e) => setEditingReceita({ ...editingReceita, tempo_preparo: e.target.value })} className="mt-1 bg-[#0D0D0D] border-[#2A2A2A]" /></div>
                <div><label className="text-xs text-muted-foreground">Imagem URL</label><Input value={editingReceita.imagem_url ?? ""} onChange={(e) => setEditingReceita({ ...editingReceita, imagem_url: e.target.value })} className="mt-1 bg-[#0D0D0D] border-[#2A2A2A]" /></div>
              </div>
              <div>
                <p className="mb-2 text-xs text-muted-foreground">Restrições compatíveis</p>
                <div className="flex flex-wrap gap-3">
                  {["vegetariana", "lactose", "gluten", "gestante"].map((r) => {
                    const checked = (editingReceita.restricoes_compativeis ?? []).includes(r);
                    return (
                      <label key={r} className="flex items-center gap-1.5 text-xs">
                        <Checkbox checked={checked} onCheckedChange={(v) => {
                          const cur = editingReceita.restricoes_compativeis ?? [];
                          setEditingReceita({ ...editingReceita, restricoes_compativeis: v ? [...cur, r] : cur.filter((x: string) => x !== r) });
                        }} />{r}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Ingredientes</p>
                  <Button size="sm" variant="outline" onClick={() => setEditingReceita({ ...editingReceita, ingredientes: [...(editingReceita.ingredientes ?? []), { nome: "", quantidade: "" }] })}><Plus className="h-3 w-3" /></Button>
                </div>
                <div className="space-y-1.5">
                  {(editingReceita.ingredientes ?? []).map((ing: any, i: number) => (
                    <div key={i} className="flex gap-1.5">
                      <Input placeholder="Nome" value={ing.nome ?? ""} onChange={(e) => { const arr = [...editingReceita.ingredientes]; arr[i] = { ...arr[i], nome: e.target.value }; setEditingReceita({ ...editingReceita, ingredientes: arr }); }} className="bg-[#0D0D0D] border-[#2A2A2A]" />
                      <Input placeholder="Quantidade" value={ing.quantidade ?? ""} onChange={(e) => { const arr = [...editingReceita.ingredientes]; arr[i] = { ...arr[i], quantidade: e.target.value }; setEditingReceita({ ...editingReceita, ingredientes: arr }); }} className="bg-[#0D0D0D] border-[#2A2A2A]" />
                      <Button size="icon" variant="ghost" onClick={() => setEditingReceita({ ...editingReceita, ingredientes: editingReceita.ingredientes.filter((_: any, idx: number) => idx !== i) })}><X className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Modo de preparo</p>
                  <Button size="sm" variant="outline" onClick={() => setEditingReceita({ ...editingReceita, modo_preparo: [...(editingReceita.modo_preparo ?? []), ""] })}><Plus className="h-3 w-3" /></Button>
                </div>
                <div className="space-y-1.5">
                  {(editingReceita.modo_preparo ?? []).map((step: string, i: number) => (
                    <div key={i} className="flex gap-1.5">
                      <span className="pt-2 text-[10px] text-muted-foreground">{i + 1}.</span>
                      <Textarea className="min-h-[44px] bg-[#0D0D0D] border-[#2A2A2A]" value={step} onChange={(e) => { const arr = [...editingReceita.modo_preparo]; arr[i] = e.target.value; setEditingReceita({ ...editingReceita, modo_preparo: arr }); }} />
                      <Button size="icon" variant="ghost" onClick={() => setEditingReceita({ ...editingReceita, modo_preparo: editingReceita.modo_preparo.filter((_: any, idx: number) => idx !== i) })}><X className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={editingReceita.ativo} onCheckedChange={(v) => setEditingReceita({ ...editingReceita, ativo: v })} /><span className="text-sm">Ativa</span></div>
              <div className="flex justify-end gap-2 border-t border-[#2A2A2A] pt-3">
                <Button variant="ghost" onClick={() => setEditingReceita(null)}>Cancelar</Button>
                <Button onClick={() => saveReceita(editingReceita)} className="bg-primary text-primary-foreground">Salvar receita</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== Badge modal ===== */}
      <Dialog open={!!editingBadge} onOpenChange={(o) => !o && setEditingBadge(null)}>
        <DialogContent className="bg-[#141414] border-[#2A2A2A]">
          <DialogHeader><DialogTitle>{editingBadge?.id ? "Editar badge" : "Nova badge"}</DialogTitle></DialogHeader>
          {editingBadge && (
            <div className="space-y-3">
              <Input placeholder="Nome" value={editingBadge.nome} onChange={(e) => setEditingBadge({ ...editingBadge, nome: e.target.value })} className="bg-[#0D0D0D] border-[#2A2A2A]" />
              <Textarea placeholder="Descrição" value={editingBadge.descricao} onChange={(e) => setEditingBadge({ ...editingBadge, descricao: e.target.value })} className="bg-[#0D0D0D] border-[#2A2A2A]" />
              <div className="flex gap-2">
                <Input className="w-20 bg-[#0D0D0D] border-[#2A2A2A]" placeholder="🏆" value={editingBadge.icone} onChange={(e) => setEditingBadge({ ...editingBadge, icone: e.target.value })} />
                <Input type="number" placeholder="XP" value={editingBadge.xp_reward} onChange={(e) => setEditingBadge({ ...editingBadge, xp_reward: e.target.value })} className="bg-[#0D0D0D] border-[#2A2A2A]" />
                <div className="flex items-center gap-2 px-2"><Switch checked={editingBadge.ativo} onCheckedChange={(v) => setEditingBadge({ ...editingBadge, ativo: v })} /><span className="text-xs">Ativo</span></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setEditingBadge(null)}>Cancelar</Button>
                <Button onClick={() => saveBadge(editingBadge)} className="bg-primary text-primary-foreground">Salvar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== Mission modal ===== */}
      <Dialog open={!!editingMission} onOpenChange={(o) => !o && setEditingMission(null)}>
        <DialogContent className="bg-[#141414] border-[#2A2A2A]">
          <DialogHeader><DialogTitle>{editingMission?.id ? `Editar missão (D${editingMission?.dia_numero})` : `Nova missão (D${editingMission?.dia_numero})`}</DialogTitle></DialogHeader>
          {editingMission && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-muted-foreground">Dia</label><Input type="number" value={editingMission.dia_numero} onChange={(e) => setEditingMission({ ...editingMission, dia_numero: e.target.value })} className="mt-1 bg-[#0D0D0D] border-[#2A2A2A]" /></div>
                <div><label className="text-xs text-muted-foreground">Ordem</label><Input type="number" value={editingMission.ordem} onChange={(e) => setEditingMission({ ...editingMission, ordem: e.target.value })} className="mt-1 bg-[#0D0D0D] border-[#2A2A2A]" /></div>
              </div>
              <div><label className="text-xs text-muted-foreground">Título</label><Input value={editingMission.titulo} onChange={(e) => setEditingMission({ ...editingMission, titulo: e.target.value })} className="mt-1 bg-[#0D0D0D] border-[#2A2A2A]" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-muted-foreground">Ícone</label><Input value={editingMission.icone} onChange={(e) => setEditingMission({ ...editingMission, icone: e.target.value })} className="mt-1 bg-[#0D0D0D] border-[#2A2A2A]" /></div>
                <div><label className="text-xs text-muted-foreground">XP</label><Input type="number" value={editingMission.xp_reward} onChange={(e) => setEditingMission({ ...editingMission, xp_reward: e.target.value })} className="mt-1 bg-[#0D0D0D] border-[#2A2A2A]" /></div>
              </div>
              <div><label className="text-xs text-muted-foreground">Descrição curta</label><Input value={editingMission.descricao_curta} onChange={(e) => setEditingMission({ ...editingMission, descricao_curta: e.target.value })} className="mt-1 bg-[#0D0D0D] border-[#2A2A2A]" /></div>
              <div><label className="text-xs text-muted-foreground">Descrição completa</label><Textarea value={editingMission.descricao_completa} onChange={(e) => setEditingMission({ ...editingMission, descricao_completa: e.target.value })} className="mt-1 min-h-[80px] bg-[#0D0D0D] border-[#2A2A2A]" /></div>
              <div><label className="text-xs text-muted-foreground">Vídeo URL (opcional)</label><Input value={editingMission.video_url ?? ""} onChange={(e) => setEditingMission({ ...editingMission, video_url: e.target.value })} className="mt-1 bg-[#0D0D0D] border-[#2A2A2A]" /></div>
              <div className="flex items-center gap-2"><Switch checked={editingMission.ativo} onCheckedChange={(v) => setEditingMission({ ...editingMission, ativo: v })} /><span className="text-sm">Ativa</span></div>
              <div className="flex justify-end gap-2 border-t border-[#2A2A2A] pt-3">
                <Button variant="ghost" onClick={() => setEditingMission(null)}>Cancelar</Button>
                <Button onClick={() => saveMission(editingMission)} className="bg-primary text-primary-foreground">Salvar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== Broadcast modal ===== */}
      <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent className="bg-[#141414] border-[#2A2A2A]">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Send className="h-4 w-4 text-primary" /> Comunicado para todas as alunas</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Textarea placeholder="Mensagem que será enviada como notificação e fixada na comunidade..." value={broadcastText} onChange={(e) => setBroadcastText(e.target.value)} className="min-h-[120px] bg-[#0D0D0D] border-[#2A2A2A]" />
            {broadcastText && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <p className="mb-1 text-[10px] uppercase text-primary">Pré-visualização</p>
                <p className="text-sm whitespace-pre-wrap">{broadcastText}</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setBroadcastOpen(false)}>Cancelar</Button>
              <Button onClick={broadcast} className="bg-primary text-primary-foreground"><Send className="mr-2 h-3.5 w-3.5" />Enviar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Confirm dialog ===== */}
      <AlertDialog open={confirm.open} onOpenChange={(o) => setConfirm((p) => ({ ...p, open: o }))}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{confirm.title}</AlertDialogTitle><AlertDialogDescription>{confirm.desc}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { confirm.onOk(); setConfirm((p) => ({ ...p, open: false })); }} className="bg-destructive hover:bg-destructive/90">Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PostCard({ p, onRemove, onPin, onReviewed, compact }: { p: any; onRemove: (id: string) => void; onPin: (id: string, cur: boolean) => void; onReviewed: (id: string) => void; compact?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${p.reportado ? "border-destructive/50 bg-destructive/5" : p.fixado ? "border-primary/40 bg-primary/5" : "border-[#2A2A2A] bg-[#141414]"}`}>
      <div className="flex items-center gap-2.5">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {(p.profiles?.full_name || p.profiles?.email || "?").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{p.profiles?.full_name || p.profiles?.email || "—"}</p>
          <p className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleString("pt-BR")}</p>
        </div>
        <div className="flex items-center gap-1">
          {p.fixado && <Pin className="h-3.5 w-3.5 text-primary" />}
          {p.reportado && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
        </div>
      </div>
      <p className={`mt-2 ${compact ? "text-xs" : "text-sm"}`}>{p.texto}</p>
      {!compact && p.imagem_url && <img src={p.imagem_url} alt="" className="mt-2 max-h-48 rounded-lg" />}
      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#2A2A2A] pt-3">
        <Button size="sm" variant="ghost" onClick={() => onRemove(p.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="mr-1 h-3 w-3" />Remover</Button>
        {p.reportado && <Button size="sm" variant="ghost" onClick={() => onReviewed(p.id)}>Marcar revisado</Button>}
        <Button size="sm" variant="ghost" onClick={() => onPin(p.id, p.fixado)}><Pin className="mr-1 h-3 w-3" />{p.fixado ? "Desafixar" : "Fixar"}</Button>
      </div>
    </div>
  );
}
