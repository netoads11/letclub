import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Heart, Flame, Zap, Plus, Flag, X, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type ReactionType = "coracao" | "forca" | "fogo";
const reactions: { type: ReactionType; icon: any; activeBg: string; activeText: string }[] = [
  { type: "coracao", icon: Heart, activeBg: "bg-red-500/10", activeText: "text-red-400" },
  { type: "forca", icon: Zap, activeBg: "bg-blue-500/10", activeText: "text-blue-400" },
  { type: "fogo", icon: Flame, activeBg: "bg-orange-500/10", activeText: "text-orange-400" },
];

const avatarColors = ["#FF8A65", "#FFB74D", "#F06292", "#BA68C8", "#9575CD", "#7986CB", "#4FC3F7", "#4DB6AC"];
const colorFor = (id: string) => avatarColors[id.charCodeAt(0) % avatarColors.length];

export default function Comunidade() {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("posts_comunidade")
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
      await supabase
        .from("reacoes_posts")
        .upsert({ post_id: postId, user_id: profile.id, tipo: type }, { onConflict: "post_id,user_id" });
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
      <header className="px-4 pt-6 pb-4">
        <h1 className="font-display text-[26px] font-bold leading-tight text-white">Comunidade</h1>
        <p className="mt-1 text-sm text-[#888]">Suporte de quem está com você</p>
      </header>

      {/* Rules banner */}
      <div className="mx-4 mb-4 rounded-xl border border-primary/20 bg-[#0F1A00] p-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-primary">📋 Regras</p>
        <p className="mt-1 text-[13px] leading-snug text-[#888]">
          Respeito, acolhimento e nada de receitas restritivas. Bora se apoiar!
        </p>
      </div>

      <div className="space-y-3 px-4 pb-5">
        {posts.length === 0 && (
          <div className="py-12 text-center">
            <div className="text-5xl">💬</div>
            <p className="mt-4 font-display text-base font-medium text-white">
              Seja a primeira a compartilhar!
            </p>
            <p className="mt-1 text-sm text-[#888]">Conta como está indo seu desafio 💚</p>
            <Button
              onClick={() => setShow(true)}
              variant="outline"
              className="mt-5 border-primary text-primary hover:bg-primary/10"
            >
              Criar post
            </Button>
          </div>
        )}

        {posts.map((p) => {
          const counts: Record<string, number> = {};
          (p.reacoes_posts ?? []).forEach(
            (r: any) => (counts[r.tipo] = (counts[r.tipo] ?? 0) + 1),
          );
          const mine = p.reacoes_posts?.find((r: any) => r.user_id === profile?.id)?.tipo;
          const initial = (p.profiles?.full_name || "?").charAt(0).toUpperCase();
          return (
            <div key={p.id} className="rounded-2xl border border-[#1E1E1E] bg-[#141414] p-4">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold text-white"
                  style={{ backgroundColor: colorFor(p.user_id || initial) }}
                >
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-sm font-medium text-white">
                    {p.profiles?.full_name || "Aluna"}
                  </p>
                  <p className="text-[11px] text-[#555]">
                    {new Date(p.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <button onClick={() => report(p.id)} className="text-[#555] hover:text-destructive">
                  <Flag className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-sm leading-[1.6] text-[#DDD]">{p.texto}</p>
              {p.imagem_url && (
                <img src={p.imagem_url} className="mt-3 max-h-80 w-full rounded-xl object-cover" />
              )}
              <div className="mt-3 flex gap-2 border-t border-[#1E1E1E] pt-3">
                {reactions.map(({ type, icon: Icon, activeBg, activeText }) => {
                  const isActive = mine === type;
                  return (
                    <button
                      key={type}
                      onClick={() => react(p.id, type)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-all ${
                        isActive ? `${activeBg} ${activeText}` : "text-[#555] hover:text-[#888]"
                      }`}
                    >
                      <Icon
                        className="h-3.5 w-3.5"
                        fill={isActive ? "currentColor" : "none"}
                      />
                      {counts[type] ?? 0}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShow(true)}
        className="fixed bottom-20 right-4 z-30 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-primary text-primary-foreground"
        style={{ boxShadow: "0 4px 20px rgba(205, 255, 0, 0.4)" }}
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
      </button>

      {/* Modal */}
      {show && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-4 pt-20"
          onClick={() => setShow(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-[#1E1E1E] bg-[#141414] p-5 slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-white">Compartilhar</h3>
              <button onClick={() => setShow(false)} className="rounded-full bg-[#1E1E1E] p-1.5">
                <X className="h-4 w-4" />
              </button>
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 280))}
              placeholder="O que você quer dividir?"
              className="mt-4 min-h-[100px] border-[#2A2A2A] bg-[#0D0D0D]"
              maxLength={280}
            />
            <p className="mt-1 text-right text-[10px] text-[#555]">{text.length}/280</p>

            <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-[#888]">
              <ImagePlus className="h-4 w-4" />
              {file ? file.name : "Adicionar foto (opcional)"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>

            <Button
              onClick={submit}
              disabled={busy || !text.trim()}
              className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {busy ? "Postando..." : "Compartilhar"}
            </Button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
