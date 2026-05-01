import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Bell, Target, UtensilsCrossed, MessageCircle, Users, Flame, Trophy, ArrowUpRight } from "lucide-react";
import { getCurrentDay } from "@/lib/challenge";

export default function Home() {
  const { profile } = useAuth();
  const [missionsToday, setMissionsToday] = useState(0);
  const [doneToday, setDoneToday] = useState(0);
  const [unread, setUnread] = useState(0);
  const [letMsg, setLetMsg] = useState("Bom dia, maravilhosa! 💚");

  const day = getCurrentDay(profile?.challenge_start_date ?? null);
  const firstName = (profile?.full_name || "").split(" ")[0] || "você";
  const streak = profile?.streak_atual ?? 0;
  const streakHot = streak >= 3;

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [m, c, n, cfg] = await Promise.all([
        supabase.from("missions").select("id", { count: "exact", head: true }).eq("dia_numero", day).eq("ativo", true),
        supabase.from("checkins").select("id", { count: "exact", head: true }).eq("user_id", profile.id).eq("dia_numero", day),
        supabase.from("notificacoes").select("id", { count: "exact", head: true }).eq("user_id", profile.id).eq("lida", false),
        supabase.from("configuracoes_app").select("valor").eq("chave", "mensagem_let_home").maybeSingle(),
      ]);
      setMissionsToday(m.count ?? 0);
      setDoneToday(c.count ?? 0);
      setUnread(n.count ?? 0);
      if (cfg.data?.valor) setLetMsg(cfg.data.valor);
    })();
  }, [profile, day]);

  const pct = missionsToday > 0 ? Math.round((doneToday / missionsToday) * 100) : 0;

  const quickActions = [
    { to: "/missoes", icon: Target, l: "Missões do dia" },
    { to: "/dieta", icon: UtensilsCrossed, l: "Dieta" },
    { to: "/chat", icon: MessageCircle, l: "Fale com a Let" },
    { to: "/comunidade", icon: Users, l: "Comunidade" },
  ];

  return (
    <AppShell>
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-6 pb-5">
        <div>
          <p className="text-xs text-[#888]">Bom dia,</p>
          <h1 className="font-display text-2xl font-bold leading-tight text-white">Oi, {firstName}! 💚</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <Link to="/notificacoes" className="relative rounded-full bg-[#141414] p-2.5 border border-[#1E1E1E]">
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                {unread}
              </span>
            )}
          </Link>
          <Link
            to="/perfil"
            className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary font-display text-sm font-bold text-primary-foreground"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} className="h-full w-full object-cover" />
            ) : (
              firstName.charAt(0).toUpperCase()
            )}
          </Link>
        </div>
      </header>

      <div className="px-4 space-y-3">
        {/* Hero progress card */}
        <div
          className="relative overflow-hidden rounded-2xl border-l-4 border-primary p-5"
          style={{ background: "linear-gradient(135deg, #1A1A1A 0%, #0F1A00 100%)" }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#888]">Seu desafio</p>
              <p className="mt-1 font-display text-[28px] font-bold leading-none text-white">
                Dia {Math.min(day, 15)} <span className="text-[#888] text-xl font-medium">de 15</span>
              </p>
            </div>
            <p className="font-display text-4xl font-extrabold text-primary text-glow leading-none">{pct}%</p>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[#1E1E1E]">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-[#888]">
            {doneToday} {doneToday === 1 ? "missão concluída" : "missões concluídas"} hoje
          </p>
        </div>

        {/* Section label */}
        <p className="pt-3 text-[11px] uppercase tracking-widest text-[#888]">Acesso rápido</p>

        {/* Quick access grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {quickActions.map(({ to, icon: Icon, l }) => (
            <Link
              key={to}
              to={to}
              className="group relative rounded-2xl border border-[#1E1E1E] bg-[#141414] p-4 transition-all hover:border-primary hover:shadow-[0_0_12px_rgba(205,255,0,0.2)]"
            >
              <div className="flex items-start justify-between">
                <Icon className="h-6 w-6 text-primary" strokeWidth={2} />
                <ArrowUpRight className="h-4 w-4 text-[#333] group-hover:text-primary transition-colors" />
              </div>
              <p className="mt-6 font-display text-sm font-medium text-white">{l}</p>
            </Link>
          ))}
        </div>

        <p className="pt-3 text-[11px] uppercase tracking-widest text-[#888]">Sua jornada</p>

        {/* Streak card */}
        <div
          className={`flex items-center justify-between rounded-2xl border p-5 transition-all ${
            streakHot
              ? "border-[#FF6B00] bg-[#141414] shadow-[0_0_20px_rgba(255,107,0,0.15)]"
              : "border-[#1E1E1E] bg-[#141414]"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={streakHot ? "animate-pulse" : ""}>
              <Flame
                className={`h-7 w-7 ${streakHot ? "text-[#FF6B00] drop-shadow-[0_0_8px_#FF6B00]" : "text-[#444]"}`}
                fill={streakHot ? "#FF6B00" : "none"}
              />
            </div>
            <div>
              <p className="text-[11px] text-[#888]">Sua sequência</p>
              <p className="font-display text-xl font-bold text-white">
                {streak} {streak === 1 ? "dia" : "dias"} seguidos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#888]">
            <Trophy className="h-4 w-4" />
            Recorde {profile?.streak_recorde ?? 0}
          </div>
        </div>

        {/* Mensagem da Let */}
        <div
          className="rounded-2xl border border-[#1E1E1E] p-5"
          style={{ background: "linear-gradient(135deg, #0F1A00 0%, #141414 100%)" }}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-display text-base font-bold text-primary-foreground">
              L
            </div>
            <div className="flex-1">
              <p className="font-display text-xs font-bold text-primary">Let</p>
              <p className="mt-1.5 text-sm italic leading-relaxed text-[#CCC]">{letMsg}</p>
              <span className="mt-3 inline-block rounded-full border border-[#1E1E1E] px-2.5 py-0.5 text-[10px] text-[#888]">
                Mensagem do dia
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
