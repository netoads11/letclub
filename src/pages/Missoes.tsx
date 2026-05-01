import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ChevronLeft, Lock, Check, Calendar } from "lucide-react";
import { getCurrentDay, getChallengePhase } from "@/lib/challenge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

type Mission = { id: string; titulo: string; descricao_curta: string; icone: string; xp_reward: number; ordem: number; dia_numero: number };

export default function Missoes() {
  const { profile } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [showHistory, setShowHistory] = useState(false);
  const [historyByDay, setHistoryByDay] = useState<Record<number, number>>({});

  const day = getCurrentDay(profile?.challenge_start_date ?? null);
  const phase = getChallengePhase(day);
  const cappedDay = Math.min(day, 15);

  useEffect(() => {
    if (!profile) return;
    load();
  }, [profile, day]);

  const [futureMissions, setFutureMissions] = useState<Mission[]>([]);

  const load = async () => {
    if (!profile) return;
    const [m, c, fm] = await Promise.all([
      supabase.from("missions").select("*").eq("dia_numero", cappedDay).eq("ativo", true).order("ordem"),
      supabase.from("checkins").select("mission_id, dia_numero").eq("user_id", profile.id),
      supabase.from("missions").select("*").gt("dia_numero", cappedDay).eq("ativo", true).order("dia_numero").order("ordem").limit(6),
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

    // Confetti when last one done
    const newDone = done.size + 1;
    if (newDone === missions.length) {
      setTimeout(() => toast.success("🎉 Dia completo! +50 XP de bônus!"), 400);
    }
  };

  const doneCount = missions.filter((m) => done.has(m.id)).length;
  const pct = missions.length ? Math.round((doneCount / missions.length) * 100) : 0;

  if (phase === "expired") {
    return (
      <AppShell>
        <div className="px-5 pt-10 text-center">
          <h1 className="font-display text-2xl font-bold">Desafio finalizado 💚</h1>
          <p className="mt-3 text-sm text-muted-foreground">Você concluiu seus 15 dias! Que tal renovar?</p>
        </div>
      </AppShell>
    );
  }

  if (showHistory) {
    return (
      <AppShell>
        <header className="flex items-center gap-3 px-5 pt-6 pb-4">
          <button onClick={() => setShowHistory(false)} className="rounded-full bg-card p-2"><ChevronLeft className="h-5 w-5" /></button>
          <h1 className="font-display text-xl font-bold">Dias anteriores</h1>
        </header>
        <div className="grid grid-cols-3 gap-3 px-5">
          {Array.from({ length: 15 }).map((_, i) => {
            const d = i + 1;
            const isPast = d < cappedDay;
            const isCurrent = d === cappedDay;
            const c = historyByDay[d] ?? 0;
            return (
              <div key={d} className={`rounded-xl border p-3 text-center ${isCurrent ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
                <p className="text-[10px] text-muted-foreground">Dia</p>
                <p className="font-display text-xl font-bold">{d}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{c} {c === 1 ? "missão" : "missões"}</p>
                {!isPast && !isCurrent && <Lock className="mx-auto mt-1 h-3 w-3 text-muted-foreground" />}
              </div>
            );
          })}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="flex items-center justify-between px-5 pt-6 pb-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Dia {cappedDay} de 15</p>
          <h1 className="font-display text-2xl font-bold">Missões do dia</h1>
        </div>
        <button onClick={() => setShowHistory(true)} className="rounded-full bg-card p-2.5"><Calendar className="h-5 w-5" /></button>
      </header>

      <div className="px-5">
        <Progress value={pct} className="h-2 bg-muted [&>div]:bg-primary" />
        <p className="mt-2 text-xs text-muted-foreground">{doneCount} de {missions.length} concluídas</p>

        {phase === "post" && (
          <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
            Seus 15 dias acabaram, mas você ainda pode acessar Dieta e Comunidade.
          </div>
        )}

        <div className="mt-5 space-y-3">
          {missions.map((m) => {
            const isDone = done.has(m.id);
            return (
              <div key={m.id} className={`rounded-2xl border p-4 transition-colors ${isDone ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
                <Link to={`/missao/${m.id}`} className="flex items-start gap-3">
                  <div className="text-2xl">{m.icone}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{m.titulo}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">{m.descricao_curta}</p>
                    <p className="mt-2 text-[10px] font-bold text-primary">+{m.xp_reward} XP</p>
                  </div>
                </Link>
                <button
                  onClick={() => checkIn(m)}
                  disabled={isDone}
                  className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${isDone ? "bg-primary/20 text-primary" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
                >
                  {isDone ? <><Check className="h-4 w-4" /> Concluída</> : "Marcar como feita"}
                </button>
              </div>
            );
          })}

          {missions.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma missão para hoje.</p>
          )}
        </div>

        {futureMissions.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Próximos dias</h2>
            <div className="space-y-2">
              {futureMissions.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-3 opacity-60">
                  <div className="text-xl grayscale">{m.icone}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">{m.titulo}</p>
                    <p className="text-[10px] text-muted-foreground">Dia {m.dia_numero} • +{m.xp_reward} XP</p>
                  </div>
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
