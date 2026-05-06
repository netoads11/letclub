import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Play, Pause, Headphones } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

type Audio = {
  id: string;
  titulo: string;
  descricao: string;
  audio_url: string;
  capa_url: string | null;
  duracao_segundos: number | null;
  ordem: number;
};

const formatTime = (sec: number) => {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

export default function Audios() {
  const nav = useNavigate();
  const [items, setItems] = useState<Audio[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, { cur: number; dur: number }>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("audios_diarios")
        .select("*")
        .eq("ativo", true)
        .order("ordem")
        .order("created_at", { ascending: false });
      setItems((data ?? []) as Audio[]);
    })();
  }, []);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const togglePlay = (a: Audio) => {
    if (playingId === a.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    const el = new Audio(a.audio_url);
    audioRef.current = el;
    el.addEventListener("timeupdate", () => {
      setProgress((p) => ({ ...p, [a.id]: { cur: el.currentTime, dur: el.duration || a.duracao_segundos || 0 } }));
    });
    el.addEventListener("ended", () => setPlayingId(null));
    el.play().catch(() => setPlayingId(null));
    setPlayingId(a.id);
  };

  const seek = (id: string, pct: number) => {
    if (playingId !== id || !audioRef.current) return;
    const dur = audioRef.current.duration;
    if (dur) audioRef.current.currentTime = dur * pct;
  };

  return (
    <AppShell>
      <header className="flex items-center gap-2 px-4 pt-6 pb-4">
        <button onClick={() => nav(-1)} aria-label="Voltar" className="-ml-1 p-1">
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </button>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-primary">Podcast da Let</p>
          <h1 className="mt-0.5 font-display text-[26px] font-bold text-foreground">Áudios diários</h1>
        </div>
      </header>

      <div className="px-4 pb-6">
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border bg-primary/10 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Headphones className="h-5 w-5" />
          </div>
          <p className="text-[13px] leading-snug text-foreground">
            Curtos, diretos e cheios de afeto. Escute quando precisar de um empurrão 💚
          </p>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhum áudio publicado ainda. Volte em breve.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((a, i) => {
              const isPlaying = playingId === a.id;
              const pr = progress[a.id];
              const dur = pr?.dur || a.duracao_segundos || 0;
              const cur = pr?.cur || 0;
              const pct = dur ? (cur / dur) * 100 : 0;
              return (
                <article key={a.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-muted">
                      {a.capa_url ? (
                        <img src={a.capa_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-secondary text-secondary-foreground">
                          <Headphones className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Episódio {String(i + 1).padStart(2, "0")}
                      </p>
                      <h3 className="mt-0.5 font-display text-[16px] font-bold leading-tight text-foreground">
                        {a.titulo}
                      </h3>
                      {a.descricao && (
                        <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
                          {a.descricao}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePlay(a)}
                      aria-label={isPlaying ? "Pausar" : "Tocar"}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95"
                    >
                      {isPlaying ? (
                        <Pause className="h-5 w-5" fill="currentColor" />
                      ) : (
                        <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
                      )}
                    </button>
                  </div>

                  {/* Progress + duração */}
                  <div className="mt-3">
                    <div
                      className="h-1.5 w-full cursor-pointer overflow-hidden rounded-full bg-muted"
                      onClick={(e) => {
                        const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                        seek(a.id, (e.clientX - r.left) / r.width);
                      }}
                    >
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                      <span>{formatTime(cur)}</span>
                      <span>{formatTime(dur)}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
