import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Send, ThumbsUp, ThumbsDown, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Msg = { id?: string; role: "user" | "assistant"; content: string; feedback?: string | null };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-with-let`;

export default function Chat() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [msgs, cfg] = await Promise.all([
        supabase.from("chat_messages").select("*").eq("user_id", profile.id).eq("session_active", true).order("created_at"),
        supabase.from("configuracoes_app").select("chave, valor").in("chave", ["sugestoes_chat_1", "sugestoes_chat_2", "sugestoes_chat_3"]),
      ]);
      setMessages((msgs.data ?? []) as Msg[]);
      setSuggestions((cfg.data ?? []).sort((a, b) => a.chave.localeCompare(b.chave)).map((c) => c.valor));
    })();
  }, [profile]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = async (text: string) => {
    if (!text.trim() || !profile || streaming) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    setMessages((p) => [...p, userMsg]);
    setInput("");
    setStreaming(true);

    // persist user msg
    const { data: savedUser } = await supabase.from("chat_messages")
      .insert({ user_id: profile.id, role: "user", content: userMsg.content })
      .select().single();
    if (savedUser) userMsg.id = savedUser.id;

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && !last.id) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: history }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error("Muitas perguntas. Aguarde um momento.");
        else if (resp.status === 402) toast.error("Créditos esgotados. Avise a admin.");
        else toast.error("Erro ao falar com a Let");
        setStreaming(false);
        setMessages((p) => p.slice(0, -1)); // remove user msg from view
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let stop = false;
      while (!stop) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { stop = true; break; }
          try {
            const p = JSON.parse(json);
            const c = p.choices?.[0]?.delta?.content;
            if (c) upsertAssistant(c);
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }

      // Persist final assistant message
      if (assistantSoFar) {
        const { data: saved } = await supabase.from("chat_messages")
          .insert({ user_id: profile.id, role: "assistant", content: assistantSoFar })
          .select().single();
        if (saved) {
          setMessages((p) => p.map((m, i) => i === p.length - 1 ? { ...m, id: saved.id } : m));
        }
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro");
    } finally {
      setStreaming(false);
    }
  };

  const giveFeedback = async (idx: number, fb: "positivo" | "negativo") => {
    const m = messages[idx];
    if (!m.id) return;
    await supabase.from("chat_messages").update({ feedback: fb }).eq("id", m.id);
    setMessages((p) => p.map((x, i) => i === idx ? { ...x, feedback: fb } : x));
    toast.success("Obrigada pelo feedback!");
  };

  const newConversation = async () => {
    if (!profile) return;
    await supabase.from("chat_messages").update({ session_active: false }).eq("user_id", profile.id).eq("session_active", true);
    setMessages([]);
    toast.success("Nova conversa iniciada");
  };

  return (
    <AppShell>
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-display font-bold text-primary-foreground">L</div>
          <div>
            <h1 className="font-display font-bold">Fale com a Let</h1>
            <p className="text-[10px] text-muted-foreground">Sua mentora do desafio</p>
          </div>
        </div>
        <button onClick={newConversation} className="rounded-full bg-card p-2"><RefreshCw className="h-4 w-4" /></button>
      </header>

      <div ref={scrollRef} className="h-[calc(100vh-260px)] overflow-y-auto px-5 py-4 scrollbar-hide">
        {messages.length === 0 && (
          <div className="space-y-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">Como posso te ajudar hoje?</p>
            <div className="space-y-2">
              {suggestions.filter(Boolean).map((s, i) => (
                <button key={i} onClick={() => send(s)} className="block w-full rounded-xl border border-border bg-card p-3 text-left text-sm transition-colors hover:border-primary/40">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                {m.role === "assistant" && m.id && (
                  <div className="mt-2 flex gap-2 border-t border-border pt-2">
                    <button onClick={() => giveFeedback(i, "positivo")} className={`rounded-full p-1 ${m.feedback === "positivo" ? "text-primary" : "text-muted-foreground"}`}>
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => giveFeedback(i, "negativo")} className={`rounded-full p-1 ${m.feedback === "negativo" ? "text-destructive" : "text-muted-foreground"}`}>
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {streaming && messages[messages.length - 1]?.role === "user" && (
            <div className="flex"><div className="rounded-2xl bg-card px-4 py-2.5 text-sm"><span className="animate-pulse">Let está digitando...</span></div></div>
          )}
        </div>
      </div>

      <div className="fixed bottom-[80px] left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-md px-5 py-3">
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pergunte algo..." className="flex-1" disabled={streaming} />
            <Button type="submit" disabled={streaming || !input.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90"><Send className="h-4 w-4" /></Button>
          </form>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">As respostas não substituem orientação médica.</p>
        </div>
      </div>
    </AppShell>
  );
}
