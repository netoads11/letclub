import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, X, ImagePlus, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import iconSelo from "@/assets/icons/selo.svg";

const formatRelative = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "Agora";
  if (min < 60) return `Há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Há ${h} ${h === 1 ? "hora" : "horas"}`;
  const d = Math.floor(h / 24);
  return `Há ${d} ${d === 1 ? "dia" : "dias"}`;
};

const formatCount = (n: number) => {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(".0", "")}K`;
  return String(n);
};

const splitFirstSentence = (text: string) => {
  const m = text.match(/^([^.!?]*[.!?])(\s+.*)?$/s);
  if (!m) return { first: text, rest: "" };
  return { first: m[1], rest: m[2] ?? "" };
};

export default function Comunidade() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
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

  useEffect(() => {
    if (searchParams.get("novo") === "1") {
      setShow(true);
      searchParams.delete("novo");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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

  const toggleLike = async (postId: string) => {
    if (!profile) return;
    const post = posts.find((p) => p.id === postId);
    const mine = post?.reacoes_posts?.find((r: any) => r.user_id === profile.id);
    if (mine?.tipo === "coracao") {
      await supabase.from("reacoes_posts").delete().eq("post_id", postId).eq("user_id", profile.id);
    } else {
      await supabase
        .from("reacoes_posts")
        .upsert({ post_id: postId, user_id: profile.id, tipo: "coracao" }, { onConflict: "post_id,user_id" });
    }
    load();
  };

  return (
    <AppShell>
      <header className="px-4 pt-6 pb-4">
        <h1 className="font-display text-[26px] font-bold leading-tight text-foreground">Comunidade</h1>
        <p className="mt-1 text-sm text-muted-foreground">Suporte de quem está com você</p>
      </header>

      <div className="space-y-4 px-4 pb-5">
        {posts.length === 0 && (
          <div className="py-12 text-center">
            <div className="text-5xl">💬</div>
            <p className="mt-4 font-display text-base font-medium text-foreground">
              Seja a primeira a compartilhar!
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Conta como está indo seu desafio 💚</p>
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
          const reacoes = p.reacoes_posts ?? [];
          const likes = reacoes.filter((r: any) => r.tipo === "coracao").length;
          const liked = !!reacoes.find((r: any) => r.user_id === profile?.id && r.tipo === "coracao");
          const totalReacoes = reacoes.length;
          const comentarios = 0; // placeholder
          const compartilhamentos = 0; // placeholder
          const { first, rest } = splitFirstSentence(p.texto || "");
          const nome = p.profiles?.full_name || "Aluna";
          const handle = "@" + (nome.split(" ")[0] || "aluna").toLowerCase();
          return (
            <article key={p.id} className="rounded-2xl border border-border bg-card p-4">
              {/* Header */}
              <div className="flex items-start gap-3">
                <Avatar
                  name={nome}
                  url={p.profiles?.avatar_url}
                  size={52}
                  shape="rounded-2xl"
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="font-display text-[15px] font-bold text-foreground truncate">{nome}</p>
                    <img src={iconSelo} alt="" className="h-4 w-4 shrink-0" />
                  </div>
                  <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
                    <Heart className="h-3 w-3 text-primary" fill="currentColor" />
                    <span className="text-[11px] font-medium text-foreground">Mensagem do Dia</span>
                    <span className="text-[11px] text-muted-foreground">·</span>
                    <span className="text-[11px] text-muted-foreground">{formatRelative(p.created_at)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Salvar"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground"
                  >
                    <Bookmark className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Mais"
                    className="flex h-9 w-9 items-center justify-center text-muted-foreground"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Texto */}
              <p className="mt-4 text-[15px] leading-[1.5] text-foreground">
                <span className="font-bold">{first}</span>
                {rest}
              </p>

              {/* Imagem */}
              {p.imagem_url && (
                <img src={p.imagem_url} alt="" className="mt-3 max-h-80 w-full rounded-xl object-cover" />
              )}

              {/* Stats */}
              <div className="mt-4 flex items-center gap-2 text-[12px] font-bold text-foreground">
                <span>{formatCount(comentarios)} Comentários</span>
                <span className="text-muted-foreground">·</span>
                <span>{formatCount(compartilhamentos)} Compartilhamentos</span>
              </div>

              {/* Footer ações */}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleLike(p.id)}
                    aria-label="Curtir"
                    className={`flex h-11 w-11 items-center justify-center rounded-full border border-border ${
                      liked ? "text-primary" : "text-foreground"
                    }`}
                  >
                    <Heart className="h-[18px] w-[18px]" fill={liked ? "currentColor" : "none"} />
                  </button>
                  <button
                    type="button"
                    aria-label="Comentar"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-foreground"
                  >
                    <MessageCircle className="h-[18px] w-[18px]" />
                  </button>
                  <button
                    type="button"
                    aria-label="Compartilhar"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-foreground"
                  >
                    <Send className="h-[18px] w-[18px]" />
                  </button>
                </div>

                {totalReacoes > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {reacoes.slice(0, 3).map((r: any, i: number) => (
                        <div key={i} className="h-7 w-7 rounded-full ring-2 ring-card overflow-hidden">
                          <Avatar name={r.user_id?.slice(0, 2) ?? "U"} size={28} shape="rounded-full" />
                        </div>
                      ))}
                    </div>
                    <p className="max-w-[140px] truncate text-[11px] text-muted-foreground">
                      <span className="font-bold text-foreground">{handle}</span>
                      {totalReacoes > 1 ? ` e outras ${formatCount(totalReacoes - 1)} pessoas` : ""}
                    </p>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Modal */}
      {show && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-4 pt-20"
          onClick={() => setShow(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-border bg-card p-5 slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-foreground">Compartilhar</h3>
              <button onClick={() => setShow(false)} className="rounded-full bg-muted p-1.5">
                <X className="h-4 w-4" />
              </button>
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 280))}
              placeholder="O que você quer dividir?"
              className="mt-4 min-h-[100px] border-border bg-background"
              maxLength={280}
            />
            <p className="mt-1 text-right text-[10px] text-muted-foreground">{text.length}/280</p>

            <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
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
