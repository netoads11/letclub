import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Bell, Target, UtensilsCrossed, MessageCircle, Users, Flame, Trophy } from "lucide-react";
import { getCurrentDay } from "@/lib/challenge";
import { Progress } from "@/components/ui/progress";

export default function Home() {
  const { profile } = useAuth();
  const [missionsToday, setMissionsToday] = useState(0);
  const [doneToday, setDoneToday] = useState(0);
  const [unread, setUnread] = useState(0);
  const [letMsg, setLetMsg] = useState("Bom dia, maravilhosa! 💚");

  const day = getCurrentDay(profile?.challenge_start_date ?? null);
  const firstName = (profile?.full_name || "").split(" ")[0] || "você";

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

  return (
    <AppShell>
      <header className="flex items-center justify-between px-5 pt-6 pb-4">
        <div>
          <p className="text-xs text-muted-foreground">Bom dia,</p>
          <h1 className="font-display text-xl font-bold">Oi, {firstName}! 💚</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/notificacoes" className="relative rounded-full bg-card p-2.5">
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">{unread}</span>
            )}
          </Link>
          <Link to="/perfil" className="h-10 w-10 overflow-hidden rounded-full border-2 border-primary/40 bg-card">
            {profile?.avatar_url ? <img src={profile.avatar_url} className="h-full w-full object-cover" /> : (
              <div className="flex h-full w-full items-center justify-center font-display text-sm font-bold text-primary">{firstName.charAt(0).toUpperCase()}</div>
            )}
          </Link>
        </div>
      </header>

      <div className="px-5">
        {/* Progress card */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Seu desafio</p>
              <p className="mt-1 font-display text-2xl font-bold">Dia {Math.min(day, 15)} <span className="text-muted-foreground">de 15</span></p>
            </div>
            <div className="text-right">
              <p className="font-display text-3xl font-extrabold text-primary text-glow">{pct}%</p>
              <p className="text-[10px] text-muted-foreground">Missões hoje</p>
            </div>
          </div>
          <Progress value={pct} className="mt-4 h-2 bg-muted [&>div]:bg-primary" />
        </div>

        {/* Quick actions */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          {[
            { to: "/missoes", icon: Target, l: "Missões do dia" },
            { to: "/dieta", icon: UtensilsCrossed, l: "Dieta" },
            { to: "/chat", icon: MessageCircle, l: "Falar com a Let" },
            { to: "/comunidade", icon: Users, l: "Comunidade" },
          ].map(({ to, icon: Icon, l }) => (
            <Link key={to} to={to} className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
              <Icon className="h-5 w-5 text-primary" />
              <p className="mt-3 text-sm font-semibold">{l}</p>
            </Link>
          ))}
        </div>

        {/* Streak card */}
        <div className={`mt-5 flex items-center justify-between rounded-2xl border p-5 ${(profile?.streak_atual ?? 0) >= 3 ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
          <div className="flex items-center gap-3">
            <Flame className={`h-7 w-7 ${(profile?.streak_atual ?? 0) >= 3 ? "text-primary" : "text-muted-foreground"}`} />
            <div>
              <p className="text-xs text-muted-foreground">Sua sequência</p>
              <p className="font-display text-lg font-bold">{profile?.streak_atual ?? 0} dias seguidos</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Trophy className="h-4 w-4" />
            Recorde {profile?.streak_recorde ?? 0}
          </div>
        </div>

        {/* Mensagem da Let */}
        <div className="mt-5 mb-5 rounded-2xl border border-border bg-gradient-to-br from-card to-primary/5 p-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-display font-bold">L</div>
            <p className="font-display font-bold">Let</p>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-foreground/90">{letMsg}</p>
        </div>
      </div>
    </AppShell>
  );
}
