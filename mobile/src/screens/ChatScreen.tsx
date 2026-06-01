import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Send, ThumbsUp, ThumbsDown, RefreshCw } from "lucide-react-native";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import Toast from "react-native-toast-message";

type Msg = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  feedback?: string | null;
  created_at?: string;
};

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const CHAT_URL = `${SUPABASE_URL}/functions/v1/chat-with-let`;

export default function ChatScreen() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const scrollRef = useRef<ScrollView>(null);

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
        (cfg.data ?? []).sort((a, b) => a.chave.localeCompare(b.chave)).map((c) => c.valor)
      );
    })();
  }, [profile]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
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
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ messages: history }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429)
          Toast.show({ type: "error", text1: "Muitas perguntas. Aguarde." });
        else if (resp.status === 402)
          Toast.show({ type: "error", text1: "Creditos esgotados." });
        else Toast.show({ type: "error", text1: "Erro ao falar com a Let" });
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
          .insert({
            user_id: profile.id,
            role: "assistant",
            content: assistantSoFar,
          })
          .select()
          .single();
        if (saved) {
          setMessages((p) =>
            p.map((m, i) =>
              i === p.length - 1 ? { ...m, id: saved.id } : m
            )
          );
        }
      }
    } catch (e: any) {
      Toast.show({ type: "error", text1: e?.message || "Erro" });
    } finally {
      setStreaming(false);
    }
  };

  const giveFeedback = async (idx: number, fb: "positivo" | "negativo") => {
    const m = messages[idx];
    if (!m.id) return;
    await supabase.from("chat_messages").update({ feedback: fb }).eq("id", m.id);
    setMessages((p) =>
      p.map((x, i) => (i === idx ? { ...x, feedback: fb } : x))
    );
    Toast.show({ type: "success", text1: "Obrigada pelo feedback!" });
  };

  const newConversation = async () => {
    if (!profile) return;
    await supabase
      .from("chat_messages")
      .update({ session_active: false })
      .eq("user_id", profile.id)
      .eq("session_active", true);
    setMessages([]);
    Toast.show({ type: "success", text1: "Nova conversa iniciada" });
  };

  const fmtTime = (iso?: string) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-border bg-background px-4 py-3.5">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-primary">
            <Text className="text-base font-bold text-primary-foreground">L</Text>
          </View>
          <View>
            <Text className="text-[18px] font-bold text-foreground">Fale com a Let</Text>
            <Text className="text-[11px] text-muted-foreground">Sua mentora do desafio</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={newConversation}
          className="rounded-full border border-border bg-card p-2"
        >
          <RefreshCw size={16} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1 px-4 py-4"
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <View className="items-center gap-4 py-6">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-primary">
                <Text className="text-2xl font-bold text-primary-foreground">L</Text>
              </View>
              <Text className="text-sm text-muted-foreground">Como posso te ajudar hoje?</Text>
            </View>
          )}

          <View className="gap-3">
            {messages.map((m, i) => {
              const isUser = m.role === "user";
              return (
                <View
                  key={i}
                  className={`flex-row ${isUser ? "justify-end" : "justify-start gap-2"}`}
                >
                  {!isUser && (
                    <View className="mt-1 h-6 w-6 items-center justify-center rounded-full bg-primary">
                      <Text className="text-[10px] font-bold text-primary-foreground">L</Text>
                    </View>
                  )}
                  <View style={{ maxWidth: isUser ? "80%" : "85%" }}>
                    <View
                      className={`rounded-2xl px-4 py-2.5 ${
                        isUser ? "bg-primary" : "bg-muted"
                      }`}
                    >
                      <Text
                        className={`text-sm leading-relaxed ${
                          isUser ? "text-primary-foreground" : "text-foreground"
                        }`}
                      >
                        {m.content}
                      </Text>
                    </View>
                    <View
                      className={`mt-1 flex-row items-center gap-2 ${
                        isUser ? "justify-end" : ""
                      }`}
                    >
                      <Text className="text-[10px] text-muted-foreground">
                        {fmtTime(m.created_at)}
                      </Text>
                      {!isUser && m.id && (
                        <>
                          <TouchableOpacity onPress={() => giveFeedback(i, "positivo")}>
                            <ThumbsUp
                              size={12}
                              color={m.feedback === "positivo" ? "#7C3AED" : "#64748B"}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => giveFeedback(i, "negativo")}>
                            <ThumbsDown
                              size={12}
                              color={m.feedback === "negativo" ? "#EF4444" : "#64748B"}
                            />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
            {streaming && messages[messages.length - 1]?.role === "user" && (
              <View className="flex-row items-start gap-2">
                <View className="mt-1 h-6 w-6 items-center justify-center rounded-full bg-primary">
                  <Text className="text-[10px] font-bold text-primary-foreground">L</Text>
                </View>
                <View className="rounded-2xl bg-muted px-4 py-2.5">
                  <Text className="text-sm text-muted-foreground">Let esta digitando...</Text>
                </View>
              </View>
            )}
          </View>
          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Suggestions + Input */}
        <View className="border-t border-border bg-background px-4 pb-2 pt-3">
          {messages.length === 0 && suggestions.filter(Boolean).length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-3"
            >
              <View className="flex-row gap-2">
                {suggestions.filter(Boolean).map((s, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => send(s)}
                    className="rounded-full border border-border bg-muted px-3 py-2"
                  >
                    <Text className="text-xs text-foreground">{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
          <View className="flex-row gap-2">
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Pergunte algo..."
              placeholderTextColor="#64748B"
              editable={!streaming}
              onSubmitEditing={() => send(input)}
              returnKeyType="send"
              className="flex-1 rounded-[20px] border border-border bg-card px-4 py-2.5 text-sm text-foreground"
            />
            <TouchableOpacity
              onPress={() => send(input)}
              disabled={streaming || !input.trim()}
              className={`h-11 w-11 items-center justify-center rounded-xl bg-primary ${
                streaming || !input.trim() ? "opacity-40" : ""
              }`}
            >
              <Send size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text className="mt-2 text-center text-[10px] text-muted-foreground">
            As respostas nao substituem orientacao medica.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
