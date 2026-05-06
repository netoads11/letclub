import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Send, ThumbsUp, ThumbsDown, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Msg = { id?: string; role: "user" | "assistant"; content: string; feedback?: string | null };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-with-let`;

// Simple markdown renderer: **bold**, numbered lists, line breaks
function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: JSX.Element[] = [];
  let listBuffer: string[] = [];
  let listType: "ol" | "ul" | null = null;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    const Tag = listType === "ol" ? "ol" : "ul";
    elements.push(
      <Tag
        key={`l-${elements.length}`}
        className={`my-1.5 ${listType === "ol" ? "list-decimal" : "list-disc"} pl-5 space-y-1`}
      >
        {listBuffer.map((item, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
        ))}
      </Tag>,
    );
    listBuffer = [];
    listType = null;
  };

  const inlineFormat = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, '<code class="bg-black/40 px-1 rounded text-xs">$1</code>');

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const olMatch = line.match(/^\s*(\d+)\.\s+(.*)/);
    const ulMatch = line.match(/^\s*[-*]\s+(.*)/);
    if (olMatch) {
      if (listType !== "ol") flushList();
      listType = "ol";
      listBuffer.push(olMatch[2]);
    } else if (ulMatch) {
      if (listType !== "ul") flushList();
      listType = "ul";
      listBuffer.push(ulMatch[1]);
    } else {
      flushList();
      if (line.trim() === "") {
        elements.push(<div key={`s-${i}`} className="h-2" />);
      } else {
        elements.push(
          <p
            key={`p-${i}`}
            className="leading-relaxed"
            dangerouslySetInnerHTML={{ __html: inlineFormat(line) }}
          />,
        );
      }
    }
  });
  flushList();
  return elements;
}

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
        supabase
          .from("chat_messages")
          .select("*")
          .eq("user_id", profile.id)
          .eq("session_active", true)
          .order("created_at"),
        supabase
          .from("configuracoes_app")
          .select("chave, valor")
          .in("chave", ["sugestoes_chat_1", "sugestoes_chat_2", "sugestoes_chat_3"]),
      ]);
      setMessages((msgs.data ?? []) as Msg[]);
      setSuggestions(
        (cfg.data ?? []).sort((a, b) => a.chave.localeCompare(b.chave)).map((c) => c.valor),
      );
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

    const { data: savedUser } = await supabase
      .from("chat_messages")
      .insert({ user_id: profile.id, role: "user", content: userMsg.content })
      .select()
      .single();
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
        setMessages((p) => p.slice(0, -1));
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
          if (json === "[DONE]") {
            stop = true;
            break;
          }
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

      if (assistantSoFar) {
        const { data: saved } = await supabase
          .from("chat_messages")
          .insert({ user_id: profile.id, role: "assistant", content: assistantSoFar })
          .select()
          .single();
        if (saved) {
          setMessages((p) => p.map((m, i) => (i === p.length - 1 ? { ...m, id: saved.id } : m)));
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
    setMessages((p) => p.map((x, i) => (i === idx ? { ...x, feedback: fb } : x)));
    toast.success("Obrigada pelo feedback!");
  };

  const newConversation = async () => {
    if (!profile) return;
    await supabase
      .from("chat_messages")
      .update({ session_active: false })
      .eq("user_id", profile.id)
      .eq("session_active", true);
    setMessages([]);
    toast.success("Nova conversa iniciada");
  };

  const fmtTime = (iso?: string) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <AppShell>
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-display text-base font-bold text-primary-foreground">
            L
          </div>
          <div>
            <h1 className="font-display text-[18px] font-bold leading-tight text-foreground">Fale com a Let</h1>
            <p className="text-[11px] text-muted-foreground">Sua mentora do desafio</p>
          </div>
        </div>
        <button
          onClick={newConversation}
          className="rounded-full border border-border bg-card p-2"
          aria-label="Nova conversa"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </header>

      <div ref={scrollRef} className="h-[calc(100vh-280px)] overflow-y-auto px-4 py-4 scrollbar-hide">
        {messages.length === 0 && (
          <div className="space-y-4 py-6 text-center">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-primary font-display text-2xl font-bold text-primary-foreground">
              L
            </div>
            <p className="text-sm text-muted-foreground">Como posso te ajudar hoje?</p>
          </div>
        )}

        <div className="space-y-3">
          {messages.map((m, i) => {
            const isUser = m.role === "user";
            return (
              <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start gap-2"}`}>
                {!isUser && (
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    L
                  </div>
                )}
                <div className={isUser ? "max-w-[80%]" : "max-w-[85%]"}>
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm ${
                      isUser ? "bg-primary text-primary-foreground" : "bg-[#1E1E1E] text-foreground"
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    ) : (
                      <div className="space-y-1">{renderMarkdown(m.content)}</div>
                    )}
                  </div>
                  <div className={`mt-1 flex items-center gap-2 text-[10px] text-[#555] ${isUser ? "justify-end" : ""}`}>
                    {fmtTime((m as any).created_at)}
                    {!isUser && m.id && (
                      <>
                        <button
                          onClick={() => giveFeedback(i, "positivo")}
                          className={m.feedback === "positivo" ? "text-primary" : "text-[#555] hover:text-muted-foreground"}
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => giveFeedback(i, "negativo")}
                          className={m.feedback === "negativo" ? "text-destructive" : "text-[#555] hover:text-muted-foreground"}
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {streaming && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-2 justify-start">
              <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                L
              </div>
              <div className="rounded-2xl bg-[#1E1E1E] px-4 py-2.5 text-sm">
                <span className="animate-pulse text-muted-foreground">Let está digitando...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="fixed bottom-[64px] left-0 right-0 z-30 border-t border-border bg-background">
        <div className="mx-auto max-w-md px-4 pt-3 pb-2">
          {/* Suggestion chips */}
          {messages.length === 0 && suggestions.filter(Boolean).length > 0 && (
            <div className="scrollbar-hide mb-3 flex gap-2 overflow-x-auto">
              {suggestions.filter(Boolean).map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  className="shrink-0 whitespace-nowrap rounded-full border border-border bg-[#1E1E1E] px-3 py-2 text-xs text-foreground transition-colors hover:border-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte algo..."
              disabled={streaming}
              className="flex-1 rounded-[20px] border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-[#555] focus:border-primary focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-2 text-center text-[10px] text-[#555]">
            As respostas não substituem orientação médica.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
