import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ChevronLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function MissaoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const nav = useNavigate();
  const [m, setM] = useState<any>(null);
  const [done, setDone] = useState<any>(null);
  const [nota, setNota] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const mr = await supabase.from("missions").select("*").eq("id", id).maybeSingle();
      if (cancelled) return;
      if (mr.error) {
        setError(mr.error.message);
        setLoading(false);
        return;
      }
      if (!mr.data) {
        setError("Missão não encontrada");
        setLoading(false);
        return;
      }
      setM(mr.data);
      if (profile) {
        const cr = await supabase
          .from("checkins")
          .select("*")
          .eq("user_id", profile.id)
          .eq("mission_id", id)
          .maybeSingle();
        if (cancelled) return;
        if (cr.data) {
          setDone(cr.data);
          setNota(cr.data.anotacao || "");
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, profile]);

  const submit = async () => {
    if (!profile || !m) return;
    setBusy(true);
    if (done) {
      await supabase.from("checkins").update({ anotacao: nota }).eq("id", done.id);
      toast.success("Anotação salva");
    } else {
      const { data, error } = await supabase.from("checkins").insert({
        user_id: profile.id,
        mission_id: m.id,
        dia_numero: m.dia_numero,
        anotacao: nota || null,
      }).select().single();
      if (error) { toast.error(error.message); setBusy(false); return; }
      setDone(data);
      toast.success(`Missão concluída! +${m.xp_reward} XP`);
    }
    setBusy(false);
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (error || !m) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-5 text-center">
      <p className="text-sm text-muted-foreground">{error || "Missão não encontrada"}</p>
      <Button variant="outline" onClick={() => nav("/missoes")}>Voltar para missões</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/95 px-5 py-4 backdrop-blur">
        <button onClick={() => nav(-1)} className="rounded-full bg-card p-2"><ChevronLeft className="h-5 w-5" /></button>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Dia {m.dia_numero}</p>
      </header>
      <div className="mx-auto max-w-md px-5 slide-up">
        <div className="text-5xl">{m.icone}</div>
        <h1 className="mt-3 font-display text-2xl font-bold">{m.titulo}</h1>
        <p className="mt-1 text-xs font-bold text-primary">+{m.xp_reward} XP</p>

        {m.video_url && (
          <div className="mt-5 aspect-video overflow-hidden rounded-2xl bg-card">
            <iframe src={m.video_url} className="h-full w-full" allow="autoplay; encrypted-media" allowFullScreen />
          </div>
        )}

        <p className="mt-5 text-sm leading-relaxed text-foreground/90">{m.descricao_completa || m.descricao_curta}</p>

        <div className="mt-6">
          <label className="text-xs text-muted-foreground">Como foi? (opcional)</label>
          <Textarea value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Suas observações sobre essa missão..." className="mt-1.5 min-h-[100px]" maxLength={500} />
        </div>

        <Button onClick={submit} disabled={busy} className="mt-5 w-full bg-primary text-primary-foreground hover:bg-primary/90">
          {done ? <><Check className="mr-2 h-4 w-4" /> Salvar anotação</> : "Marcar como concluída"}
        </Button>
      </div>
    </div>
  );
}
