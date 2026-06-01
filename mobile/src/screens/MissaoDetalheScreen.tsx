import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { ChevronLeft, Check } from "lucide-react-native";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { RootStackParamList } from "@/navigation/types";
import Toast from "react-native-toast-message";

type Route = RouteProp<RootStackParamList, "MissaoDetalhe">;

export default function MissaoDetalheScreen() {
  const { profile } = useAuth();
  const nav = useNavigation();
  const route = useRoute<Route>();
  const { id } = route.params;

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
      if (mr.error) { setError(mr.error.message); setLoading(false); return; }
      if (!mr.data) { setError("Missao nao encontrada"); setLoading(false); return; }
      setM(mr.data);
      if (profile) {
        const cr = await supabase
          .from("checkins")
          .select("*")
          .eq("user_id", profile.id)
          .eq("mission_id", id)
          .maybeSingle();
        if (cancelled) return;
        if (cr.data) { setDone(cr.data); setNota(cr.data.anotacao || ""); }
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
      Toast.show({ type: "success", text1: "Anotacao salva" });
    } else {
      const { data, error } = await supabase
        .from("checkins")
        .insert({
          user_id: profile.id,
          mission_id: m.id,
          dia_numero: m.dia_numero,
          anotacao: nota || null,
        })
        .select()
        .single();
      if (error) { Toast.show({ type: "error", text1: error.message }); setBusy(false); return; }
      setDone(data);
      Toast.show({ type: "success", text1: `Missao concluida! +${m.xp_reward} XP` });
    }
    setBusy(false);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  if (error || !m) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background px-5">
        <Text className="text-sm text-muted-foreground">{error || "Missao nao encontrada"}</Text>
        <TouchableOpacity onPress={() => nav.goBack()} className="mt-4 rounded-xl border border-border px-4 py-2">
          <Text className="text-sm text-foreground">Voltar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-3 px-5 py-4">
          <TouchableOpacity onPress={() => nav.goBack()} className="rounded-full bg-card p-2">
            <ChevronLeft size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-xs uppercase tracking-wide text-muted-foreground">
            Dia {m.dia_numero}
          </Text>
        </View>

        <View className="px-5">
          <Text className="text-5xl">{m.icone}</Text>
          <Text className="mt-3 text-2xl font-bold text-foreground">{m.titulo}</Text>
          <Text className="mt-1 text-xs font-bold text-primary">+{m.xp_reward} XP</Text>

          <Text className="mt-5 text-sm leading-relaxed text-foreground/90">
            {m.descricao_completa || m.descricao_curta}
          </Text>

          <View className="mt-6">
            <Text className="text-xs text-muted-foreground">Como foi? (opcional)</Text>
            <TextInput
              value={nota}
              onChangeText={setNota}
              placeholder="Suas observacoes sobre essa missao..."
              placeholderTextColor="#64748B"
              multiline
              maxLength={500}
              className="mt-1.5 min-h-[100px] rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground"
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            onPress={submit}
            disabled={busy}
            className={`mb-10 mt-5 flex-row items-center justify-center rounded-xl bg-primary py-3.5 ${busy ? "opacity-50" : ""}`}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : done ? (
              <>
                <Check size={16} color="#fff" style={{ marginRight: 8 }} />
                <Text className="text-sm font-semibold text-primary-foreground">Salvar anotacao</Text>
              </>
            ) : (
              <Text className="text-sm font-semibold text-primary-foreground">Marcar como concluida</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
