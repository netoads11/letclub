import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ChevronLeft, Heart, Clock } from "lucide-react";
import { toast } from "sonner";

export default function ReceitaDetalhe() {
  const { id } = useParams();
  const { profile } = useAuth();
  const nav = useNavigate();
  const [r, setR] = useState<any>(null);
  const [fav, setFav] = useState(false);

  useEffect(() => {
    if (!id || !profile) return;
    (async () => {
      const [rr, fr] = await Promise.all([
        supabase.from("receitas").select("*").eq("id", id).maybeSingle(),
        supabase.from("receitas_favoritas").select("id").eq("user_id", profile.id).eq("receita_id", id).maybeSingle(),
      ]);
      setR(rr.data);
      setFav(!!fr.data);
    })();
  }, [id, profile]);

  const toggleFav = async () => {
    if (!profile || !id) return;
    if (fav) {
      await supabase.from("receitas_favoritas").delete().eq("user_id", profile.id).eq("receita_id", id);
      setFav(false);
    } else {
      await supabase.from("receitas_favoritas").insert({ user_id: profile.id, receita_id: id });
      setFav(true);
      toast.success("Salva nos favoritos");
    }
  };

  if (!r) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background/95 px-5 py-4 backdrop-blur">
        <button onClick={() => nav(-1)} className="rounded-full bg-card p-2"><ChevronLeft className="h-5 w-5" /></button>
        <button onClick={toggleFav} className="rounded-full bg-card p-2">
          <Heart className={`h-5 w-5 ${fav ? "fill-primary text-primary" : ""}`} />
        </button>
      </header>
      <div className="mx-auto max-w-md px-5 slide-up">
        {r.imagem_url && <img src={r.imagem_url} alt={r.nome} className="mb-4 h-48 w-full rounded-2xl object-cover" />}
        <h1 className="font-display text-2xl font-bold">{r.nome}</h1>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-4 w-4" /> {r.tempo_preparo} minutos
        </div>

        <h2 className="mt-6 font-display text-lg font-bold">Ingredientes</h2>
        <ul className="mt-2 space-y-2">
          {(r.ingredientes ?? []).map((i: any, idx: number) => (
            <li key={idx} className="flex items-start gap-2 rounded-xl bg-card p-3 text-sm">
              <span className="text-primary">•</span>
              <div><span className="font-medium">{i.nome}</span> <span className="text-muted-foreground">— {i.quantidade}</span></div>
            </li>
          ))}
        </ul>

        <h2 className="mt-6 font-display text-lg font-bold">Modo de preparo</h2>
        <ol className="mt-2 space-y-3">
          {(r.modo_preparo ?? []).map((p: string, idx: number) => (
            <li key={idx} className="flex gap-3 rounded-xl bg-card p-3 text-sm">
              <span className="font-display font-bold text-primary">{idx + 1}.</span>
              <span>{p}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
