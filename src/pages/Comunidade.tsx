import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Heart, Flame, Zap, Plus, Flag, X, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type ReactionType = "coracao" | "forca" | "fogo";
const reactions: { type: ReactionType; icon: any }[] = [
  { type: "coracao", icon: Heart },
  { type: "forca", icon: Zap },
  { type: "fogo", icon: Flame },
];

export default function Comunidade() {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("posts_comunidade")
      .select("*, profiles(full_name, avatar_url), reacoes_posts(tipo, user_id)")
      .eq("removido", false)
      .order("fixado", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    setPosts(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!text.trim() || !profile) return;
    setBusy(true);
    let imgUrl: string | null = null;
    if (file) {
      const path = `${profile.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("community-posts").upload(path, file);
      if (!upErr) {
        const { data: pub } = supabase.storage.from("community-posts").getPublicUrl(path);
        imgUrl = pub.publicUrl;
      }
    }
    const { error } = await supabase.from("posts_comunidade").insert({
      user_id: profile.id,
      texto: text.trim().slice(0, 280),
      imagem_url: imgUrl,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Post compartilhado! +5 XP");
    setText(""); setFile(null); setShow(false);
    load();
  };

  const react = async (postId: string, type: ReactionType) => {
    if (!profile) return;
    const post = posts.find((p) => p.id === postId);
    const mine = post?.reacoes_posts?.find((r: any) => r.user_id === profile.id);
    if (mine?.tipo === type) {
      await supabase.from("reacoes_posts").delete().eq("post_id", postId).eq("user_id", profile.id);
    } else {
      await supabase.from("reacoes_posts").upsert({ post_id: postId, user_id: profile.id, tipo: type }, { onConflict: "post_id,user_id" });
    }
    load();
  };

  const report = async (postId: string) => {
    if (!confirm("Reportar este post?")) return;
    await supabase.from("posts_comunidade").update({ reportado: true }).eq("id", postId);
    toast.success("Reportado. Obrigada!");
  };

  return (
    <AppShell>
      <header className="px-5 pt-6 pb-3">
        <h1 className="font-display text-2xl font-bold">Comunidade</h1>
        <p className="mt-1 text-sm text-muted-foreground">Suporte de quem está com você</p>
      </header>

      <div className="mx-5 mb-4 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
        <strong className="text-primary">Regras:</strong> respeito, acolhimento e nada de receitas restritivas. Bora se apoiar!
      </div>

      <div className="space-y-3 px-5 pb-5">
        {posts.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Seja a primeira a postar!</p>}
        {posts.map((p) => {
          const counts: Record<string, number> = {};
          (p.reacoes_posts ?? []).forEach((r: any) => counts[r.tipo] = (counts[r.tipo] ?? 0) + 1);
          const mine = p.reacoes_posts?.find((r: any) => r.user_id === profile?.id)?.tipo;
          return (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted font-display text-xs font-bold">
                  {(p.profiles?.full_name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{p.profiles?.full_name || "Aluna"}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
                <button onClick={() => report(p.id)} className="text-muted-foreground"><Flag className="h-4 w-4" /></button>
              </div>
              <p className="mt-3 text-sm leading-relaxed">{p.texto}</p>
              {p.imagem_url && <img src={p.imagem_url} className="mt-3 max-h-80 w-full rounded-xl object-cover" />}
              <div className="mt-3 flex gap-2 border-t border-border pt-3">
                {reactions.map(({ type, icon: Icon }) => (
                  <button key={type} onClick={() => react(p.id, type)}
                    className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-colors ${mine === type ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                    <Icon className="h-3.5 w-3.5" /> {counts[type] ?? 0}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAB */}
      <button onClick={() => setShow(true)} className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg glow-primary">
        <Plus className="h-6 w-6" />
      </button>

      {/* Modal */}
      {show && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-4 pt-20" onClick={() => setShow(false)}>
          <div className="w-full max-w-md rounded-3xl bg-card p-5 slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Compartilhar</h3>
              <button onClick={() => setShow(false)} className="rounded-full bg-muted p-1.5"><X className="h-4 w-4" /></button>
            </div>
            <Textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 280))} placeholder="O que você quer dividir?" className="mt-4 min-h-[100px]" maxLength={280} />
            <p className="mt-1 text-right text-[10px] text-muted-foreground">{text.length}/280</p>

            <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <ImagePlus className="h-4 w-4" />
              {file ? file.name : "Adicionar foto (opcional)"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>

            <Button onClick={submit} disabled={busy || !text.trim()} className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90">
              {busy ? "Postando..." : "Compartilhar"}
            </Button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
