import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import {
  Menu,
  Bookmark,
  MoreHorizontal,
  Heart,
} from "lucide-react";
import { getCurrentDay } from "@/lib/challenge";
import iconRaio from "@/assets/icons/raio.svg";
import iconSelo from "@/assets/icons/selo.svg";
import iconAlvo from "@/assets/icons/alvo.svg";
import iconChatLet from "@/assets/icons/chat-let.svg";
import iconMaca from "@/assets/icons/maca.svg";
import iconMic from "@/assets/icons/microphone.svg";
import iconSeta from "@/assets/icons/seta.svg";
import iconFogoSimples from "@/assets/icons/fogo-simples.svg";
import iconFogoDuplo from "@/assets/icons/fogo-duplo.svg";
import { Avatar } from "@/components/Avatar";

const greetingFor = (d: Date) => {
  const h = d.getHours();
  if (h < 12) return "Bom dia!";
  if (h < 18) return "Boa tarde!";
  return "Boa noite!";
};

export default function Home() {
  const { profile } = useAuth();
  const [missionsToday, setMissionsToday] = useState(0);
  const [doneToday, setDoneToday] = useState(0);
  const [letMsg, setLetMsg] = useState(
    "Bom diaaaa, maravilhosa! Lembre-se: pequenos passos consistentes mudam tudo. Bora pra mais um dia?",
  );

  const day = getCurrentDay(profile?.challenge_start_date ?? null);
  const firstName = (profile?.full_name || "").split(" ")[0] || "você";
  const streak = profile?.streak_atual ?? 0;
  const xp = profile?.xp_total ?? 0;

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [m, c, cfg] = await Promise.all([
        supabase
          .from("missions")
          .select("id", { count: "exact", head: true })
          .eq("dia_numero", day)
          .eq("ativo", true),
        supabase
          .from("checkins")
          .select("id", { count: "exact", head: true })
          .eq("user_id", profile.id)
          .eq("dia_numero", day),
        supabase
          .from("configuracoes_app")
          .select("valor")
          .eq("chave", "mensagem_let_home")
          .maybeSingle(),
      ]);
      setMissionsToday(m.count ?? 0);
      setDoneToday(c.count ?? 0);
      if (cfg.data?.valor) setLetMsg(cfg.data.valor);
    })();
  }, [profile, day]);

  const pct =
    missionsToday > 0 ? Math.round((doneToday / missionsToday) * 100) : 0;

  const quickActions = [
    { to: "/dieta", icon: iconMaca, label: "Meu Cardápio" },
    { to: "/chat", icon: iconChatLet, label: "Fale com a Let" },
    { to: "/missoes", icon: iconMic, label: "Áudios Diários" },
    { to: "/missoes", icon: iconAlvo, label: "Missões do dia" },
  ];

  return (
    <AppShell>
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-6 pb-5">
        <Link to="/perfil" className="flex items-center gap-3">
          <Avatar
            name={profile?.full_name}
            url={profile?.avatar_url}
            size={48}
            shape="rounded-2xl"
          />
          <div className="leading-tight">
            <p className="text-sm text-muted-foreground">
              {greetingFor(new Date())}
            </p>
            <h1 className="flex items-center gap-1.5 font-display text-[22px] font-bold text-foreground">
              Olá, {firstName}
              <img src={iconSelo} alt="" className="h-4 w-4" />
            </h1>
          </div>
        </Link>
        <button
          type="button"
          aria-label="Menu"
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-foreground"
        >
          <Menu className="h-5 w-5" strokeWidth={2.4} />
        </button>
      </header>

      <div className="space-y-4 px-5">
        {/* Hero — Desafio Diário */}
        <div className="relative overflow-hidden rounded-3xl bg-secondary p-6 text-secondary-foreground">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs">
                <img src={iconRaio} alt="" className="h-3.5 w-auto" />
                <span className="opacity-90">Desafio Diário</span>
              </div>
              <p className="mt-3 font-display text-[34px] font-bold leading-none">
                Dia {Math.min(day, 15)}{" "}
                <span className="text-xl font-medium opacity-80">de 15</span>
              </p>
            </div>
            <p className="font-display text-4xl font-extrabold leading-none">
              {pct}%
            </p>
          </div>
          <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white transition-all duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-3 text-xs opacity-90">
            <span className="font-bold">{doneToday} missões</span> concluídas
            hoje.
          </p>
        </div>

        {/* Quick actions 2x2 */}
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map(({ to, icon, label }) => (
            <Link
              key={label}
              to={to}
              className="group relative rounded-2xl bg-card p-4 shadow-card transition-transform active:scale-[0.98]"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary">
                  <img src={icon} alt="" className="h-5 w-5" />
                </div>
                <img src={iconSeta} alt="" className="h-3.5 w-3.5" />
              </div>
              <p className="mt-8 font-display text-[15px] font-semibold text-foreground">
                {label}
              </p>
            </Link>
          ))}
        </div>

        {/* Sua jornada / Pontuação */}
        <div className="flex items-center justify-between rounded-2xl bg-primary/15 px-5 py-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-foreground/80">
              <img src={iconFogoSimples} alt="" className="h-3.5 w-auto" />
              Sua Jornada
            </div>
            <p className="mt-1 font-display text-xl font-bold text-foreground">
              {streak} {streak === 1 ? "Dia Seguido" : "Dias Seguidos"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <img src={iconFogoDuplo} alt="" className="h-9 w-auto" />
            <div className="text-right">
              <p className="text-xs text-foreground/80">Pontuação</p>
              <p className="font-display text-xl font-bold text-foreground">
                {xp} XP
              </p>
            </div>
          </div>
        </div>

        {/* Mensagem do Dia */}
        <div className="rounded-2xl bg-card p-4 shadow-card">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-secondary-foreground">
              <span className="font-display text-sm font-bold">L</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-[15px] font-bold text-foreground">
                    LETClub
                  </span>
                  <img src={iconSelo} alt="" className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Salvar"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground"
                  >
                    <Bookmark className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Mais"
                    className="flex h-8 w-8 items-center justify-center text-muted-foreground"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Heart className="h-3.5 w-3.5 text-primary" fill="currentColor" />
                Mensagem do Dia · Há 7 horas
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground">
                <span className="font-bold">
                  {letMsg.split(/[.,!?]/)[0]}
                  {letMsg.match(/[.,!?]/)?.[0] ?? ""}
                </span>
                {letMsg.slice((letMsg.split(/[.,!?]/)[0] + (letMsg.match(/[.,!?]/)?.[0] ?? "")).length)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
