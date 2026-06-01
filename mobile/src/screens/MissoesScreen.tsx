import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronLeft, Lock, Check, Calendar } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentDay, getChallengePhase } from "@/lib/challenge";
import type { RootStackParamList } from "@/navigation/types";
import Toast from "react-native-toast-message";

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Mission = {
  id: string;
  titulo: string;
  descricao_curta: string;
  icone: string;
  xp_reward: number;
  ordem: number;
  dia_numero: number;
};

export default function MissoesScreen() {
  const { profile } = useAuth();
  const nav = useNavigation<Nav>();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [showHistory, setShowHistory] = useState(false);
  const [historyByDay, setHistoryByDay] = useState<Record<number, number>>({});
  const [futureMissions, setFutureMissions] = useState<Mission[]>([]);

  const day = getCurrentDay(profile?.challenge_start_date ?? null);
  const phase = getChallengePhase(day);
  const cappedDay = Math.min(day, 15);

  useEffect(() => {
    if (!profile) return;
    load();
  }, [profile, day]);

  const load = async () => {
    if (!profile) return;
    const [m, c, fm] = await Promise.all([
      supabase.from("missions").select("*").eq("dia_numero", cappedDay).eq("ativo", true).order("ordem"),
      supabase.from("checkins").select("mission_id, dia_numero").eq("user_id", profile.id),
      supabase.from("missions").select("*").gt("dia_numero", cappedDay).eq("ativo", true).order("dia_numero").order("ordem").limit(6),
    ]);
    setMissions((m.data ?? []) as Mission[]);
    setFutureMissions((fm.data ?? []) as Mission[]);
    const set = new Set<string>();
    const byDay: Record<number, number> = {};
    (c.data ?? []).forEach((r: any) => {
      set.add(r.mission_id);
      byDay[r.dia_numero] = (byDay[r.dia_numero] ?? 0) + 1;
    });
    setDone(set);
    setHistoryByDay(byDay);
  };

  const checkIn = async (m: Mission) => {
    if (!profile || done.has(m.id)) return;
    const { error } = await supabase.from("checkins").insert({
      user_id: profile.id,
      mission_id: m.id,
      dia_numero: m.dia_numero,
    });
    if (error) return Toast.show({ type: "error", text1: error.message });
    setDone(new Set([...done, m.id]));
    Toast.show({ type: "success", text1: `+${m.xp_reward} XP! ${m.icone}` });
    if (done.size + 1 === missions.length) {
      setTimeout(() => Toast.show({ type: "success", text1: "Dia completo! +50 XP de bonus!" }), 400);
    }
  };

  const doneCount = missions.filter((m) => done.has(m.id)).length;
  const pct = missions.length ? Math.round((doneCount / missions.length) * 100) : 0;
  const allDone = missions.length > 0 && doneCount === missions.length;

  if (phase === "expired") {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-2xl font-bold text-foreground">Desafio finalizado!</Text>
          <Text className="mt-3 text-sm text-muted-foreground">Voce concluiu seus 15 dias! Que tal renovar?</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showHistory) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-row items-center gap-3 px-4 pb-4 pt-6">
          <TouchableOpacity onPress={() => setShowHistory(false)} className="rounded-full border border-border bg-card p-2">
            <ChevronLeft size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-foreground">Dias anteriores</Text>
        </View>
        <ScrollView className="px-4">
          <View className="flex-row flex-wrap gap-2.5">
            {Array.from({ length: 15 }).map((_, i) => {
              const d = i + 1;
              const isPast = d < cappedDay;
              const isCurrent = d === cappedDay;
              const c = historyByDay[d] ?? 0;
              return (
                <View
                  key={d}
                  className={`w-[31%] items-center rounded-xl border p-3 ${
                    isCurrent ? "border-primary bg-primary/10" : "border-border bg-card"
                  }`}
                >
                  <Text className="text-[10px] text-muted-foreground">Dia</Text>
                  <Text className="text-xl font-bold text-foreground">{d}</Text>
                  <Text className="mt-1 text-[10px] text-muted-foreground">
                    {c} {c === 1 ? "missao" : "missoes"}
                  </Text>
                  {!isPast && !isCurrent && <Lock size={12} color="#64748B" style={{ marginTop: 4 }} />}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-start justify-between px-4 pb-4 pt-6">
          <View className="flex-row items-start gap-2">
            <TouchableOpacity onPress={() => nav.goBack()} className="-ml-1 mt-1 p-1">
              <ChevronLeft size={24} color="#0F172A" />
            </TouchableOpacity>
            <View>
              <Text className="text-[11px] uppercase tracking-widest text-primary">
                Dia {cappedDay} de 15
              </Text>
              <Text className="mt-1 text-[26px] font-bold text-foreground">
                Missoes do dia
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setShowHistory(true)}
            className="rounded-full border border-border bg-card p-2.5"
          >
            <Calendar size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <View className="px-4">
          {/* Progress */}
          <View className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <View className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </View>
          <Text className="mt-2 text-xs text-muted-foreground">
            {doneCount} de {missions.length} concluidas
          </Text>

          {allDone && (
            <View className="mt-5 rounded-2xl border border-primary bg-primary/10 p-4">
              <Text className="text-center font-bold text-primary">
                Dia completo! +50 XP bonus
              </Text>
            </View>
          )}

          {/* Mission cards */}
          <View className="mt-5 gap-3">
            {missions.map((m) => {
              const isDone = done.has(m.id);
              return (
                <View
                  key={m.id}
                  className={`rounded-2xl border p-3 ${
                    isDone ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <TouchableOpacity
                    onPress={() => nav.navigate("MissaoDetalhe", { id: m.id })}
                    className="flex-row items-start gap-3"
                  >
                    <View className="relative h-9 w-9 items-center justify-center rounded-full bg-muted">
                      <Text className="text-lg">{m.icone}</Text>
                      {isDone && (
                        <View className="absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full bg-primary">
                          <Check size={12} color="#fff" strokeWidth={3} />
                        </View>
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className={`text-base font-semibold text-foreground ${isDone ? "opacity-60" : ""}`}>
                        {m.titulo}
                      </Text>
                      <Text className="mt-0.5 text-[13px] text-muted-foreground">{m.descricao_curta}</Text>
                      <View className="mt-2 self-start rounded-full bg-primary/10 px-2.5 py-0.5">
                        <Text className="text-xs font-bold text-primary">+{m.xp_reward} XP</Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {isDone ? (
                    <View className="mt-3 h-10 flex-row items-center justify-center gap-2">
                      <Check size={16} color="#7C3AED" strokeWidth={3} />
                      <Text className="text-sm font-medium text-primary">Concluida</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => checkIn(m)}
                      className="mt-3 h-10 items-center justify-center rounded-xl bg-primary"
                      activeOpacity={0.9}
                    >
                      <Text className="text-sm font-medium text-primary-foreground">
                        Marcar como feita
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {missions.length === 0 && (
              <Text className="py-10 text-center text-sm text-muted-foreground">
                Nenhuma missao para hoje.
              </Text>
            )}
          </View>

          {/* Future missions */}
          {futureMissions.length > 0 && (
            <View className="mt-8 mb-6">
              <Text className="mb-3 text-[11px] uppercase tracking-widest text-muted-foreground">
                Proximos dias
              </Text>
              <View className="gap-2">
                {futureMissions.map((m) => (
                  <View
                    key={m.id}
                    className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3 opacity-40"
                  >
                    <View className="h-9 w-9 items-center justify-center rounded-full bg-muted">
                      <Text className="text-lg">{m.icone}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-[14px] font-medium text-muted-foreground">{m.titulo}</Text>
                      <View className="mt-0.5 self-start rounded-md bg-muted px-1.5 py-0.5">
                        <Text className="text-[12px] text-muted-foreground">Dia {m.dia_numero}</Text>
                      </View>
                    </View>
                    <Lock size={16} color="#64748B" />
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
