import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ChevronLeft, Lock, Check, Calendar } from "lucide-react";
import { getCurrentDay, getChallengePhase } from "@/lib/challenge";
import { toast } from "sonner";

type Mission = {
  id: string;
  titulo: string;
  descricao_curta: string;
  icone: string;
  xp_reward: number;
  ordem: number;
  dia_numero: number;
};

export default function Missoes() {
  const { profile } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [showHistory, setShowHistory] = useState(false);
  const [historyByDay, setHistoryByDay] = useState<Record<number, number>>({});
  const [futureMissions, setFutureMissions] = useState<Mission[]>([]);

  const day = getCurrentDay(profile?.challenge_start_date ?? null);
  const phase = getChallengePhase(day);
  const cappedDay = Math.min(day, 15);

  useEffect(() => {
    if (!profile) return;
    load();
  }, [profile, day]);

  const load = async () => {
    if (!profile) return;
    const [m, c, fm] = await Promise.all([
      supabase.from("missions").select("*").eq("dia_numero", cappedDay).eq("ativo", true).order("ordem"),
      supabase.from("checkins").select("mission_id, dia_numero").eq("user_id", profile.id),
      supabase
        .from("missions")
        .select("*")
        .gt("dia_numero", cappedDay)
        .eq("ativo", true)
        .order("dia_numero")
        .order("ordem")
        .limit(6),
    ]);
    setMissions((m.data ?? []) as Mission[]);
    setFutureMissions((fm.data ?? []) as Mission[]);
    const set = new Set<string>();
    const byDay: Record<number, number> = {};
    (c.data ?? []).forEach((r: any) => {
      set.add(r.mission_id);
      byDay[r.dia_numero] = (byDay[r.dia_numero] ?? 0) + 1;
    });
    setDone(set);
    setHistoryByDay(byDay);
  };

  const checkIn = async (m: Mission) => {
    if (!profile || done.has(m.id)) return;
    const { error } = await supabase.from("checkins").insert({
      user_id: profile.id,
      mission_id: m.id,
      dia_numero: m.dia_numero,
    });
    if (error) return toast.error(error.message);
    setDone(new Set([...done, m.id]));
    toast.success(`+${m.xp_reward} XP! ${m.icone}`);

    const newDone = done.size + 1;
    if (newDone === missions.length) {
      setTimeout(() => toast.success("🎉 Dia completo! +50 XP de bônus!"), 400);
    }
  };

  const doneCount = missions.filter((m) => done.has(m.id)).length;
  const pct = missions.length ? Math.round((doneCount / missions.length) * 100) : 0;
  const allDone = missions.length > 0 && doneCount === missions.length;

  if (phase === "expired") {
    return (
      <AppShell>
        <div className="px-4 pt-10 text-center">
          <h1 className="font-display text-2xl font-bold">Desafio finalizado 💚</h1>
          <p className="mt-3 text-sm text-[#888]">Você concluiu seus 15 dias! Que tal renovar?</p>
        </div>
      </AppShell>
    );
  }

  if (showHistory) {
    return (
      <AppShell>
        <header className="flex items-center gap-3 px-4 pt-6 pb-4">
          <button onClick={() => setShowHistory(false)} className="rounded-full bg-[#141414] p-2 border border-[#1E1E1E]">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-xl font-bold">Dias anteriores</h1>
        </header>
        <div className="grid grid-cols-3 gap-2.5 px-4">
          {Array.from({ length: 15 }).map((_, i) => {
            const d = i + 1;
            const isPast = d < cappedDay;
            const isCurrent = d === cappedDay;
            const c = historyByDay[d] ?? 0;
            return (
              <div
                key={d}
                className={`rounded-xl border p-3 text-center ${
                  isCurrent ? "border-primary bg-primary/10" : "border-[#1E1E1E] bg-[#141414]"
                }`}
              >
                <p className="text-[10px] text-[#888]">Dia</p>
                <p className="font-display text-xl font-bold">{d}</p>
                <p className="mt-1 text-[10px] text-[#888]">{c} {c === 1 ? "missão" : "missões"}</p>
                {!isPast && !isCurrent && <Lock className="mx-auto mt-1 h-3 w-3 text-[#444]" />}
              </div>
            );
          })}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Header */}
      <header className="flex items-start justify-between px-4 pt-6 pb-4">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-primary">Dia {cappedDay} de 15</p>
          <h1 className="mt-1 font-display text-[26px] font-bold text-white">Missões do dia</h1>
        </div>
        <button
          onClick={() => setShowHistory(true)}
          className="rounded-full border border-[#1E1E1E] bg-[#141414] p-2.5"
        >
          <Calendar className="h-5 w-5" />
        </button>
      </header>

      <div className="px-4">
        {/* Progress */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1E1E1E]">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-[#888]">
          {doneCount} de {missions.length} concluídas
        </p>

        {phase === "post" && (
          <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
            Seus 15 dias acabaram, mas você ainda pode acessar Dieta e Comunidade.
          </div>
        )}

        {/* Completion banner */}
        {allDone && (
          <div
            className="mt-5 rounded-2xl border border-primary p-4 text-center fade-in"
            style={{ background: "linear-gradient(135deg, #0F2200 0%, #1A3300 100%)" }}
          >
            <p className="font-display text-base font-bold text-primary">🎉 Dia completo! +50 XP bônus</p>
          </div>
        )}

        {/* Mission cards */}
        <div className="mt-5 space-y-3">
          {missions.map((m) => {
            const isDone = done.has(m.id);
            return (
              <div
                key={m.id}
                className={`rounded-2xl border p-3 transition-all ${
                  isDone ? "border-primary/30" : "border-[#1E1E1E] bg-[#141414]"
                }`}
                style={
                  isDone
                    ? { background: "linear-gradient(135deg, #0A1A00 0%, #0F1A00 100%)" }
                    : undefined
                }
              >
                <Link to={`/missao/${m.id}`} className="flex items-start gap-3">
                  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1E1E1E] text-lg">
                    {m.icone}
                    {isDone && (
                      <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                        <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-display text-base font-semibold text-white ${isDone ? "opacity-60" : ""}`}>
                      {m.titulo}
                    </h3>
                    <p className="mt-0.5 text-[13px] text-[#AAA]">{m.descricao_curta}</p>
                    <span className="mt-2 inline-block rounded-full bg-[#0F1A00] px-2.5 py-0.5 text-xs font-bold text-primary">
                      +{m.xp_reward} XP
                    </span>
                  </div>
                </Link>
                {isDone ? (
                  <div className="mt-3 flex h-10 items-center justify-center gap-2 text-sm font-medium text-primary">
                    <Check className="h-4 w-4" strokeWidth={3} /> Concluída
                  </div>
                ) : (
                  <button
                    onClick={() => checkIn(m)}
                    className="mt-3 h-10 w-full rounded-xl bg-primary font-display text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
                  >
                    Marcar como feita
                  </button>
                )}
              </div>

        {/* Future missions */}
        {futureMissions.length > 0 && (
          <div className="mt-8">
            <p className="mb-3 text-[11px] uppercase tracking-widest text-[#444]">Próximos dias</p>
            <div className="space-y-2">
              {futureMissions.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-2xl border border-[#1E1E1E] bg-[#141414] p-3 opacity-40"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1E1E1E] text-lg grayscale">
                    {m.icone}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#888]">{m.titulo}</p>
                    <span className="mt-0.5 inline-block rounded-md bg-[#1E1E1E] px-1.5 py-0.5 text-[9px] text-[#888]">
                      Dia {m.dia_numero}
                    </span>
                  </div>
                  <Lock className="h-4 w-4 text-[#444]" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
