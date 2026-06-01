import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Bell, Bookmark, MoreHorizontal, Heart } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentDay } from "@/lib/challenge";
import type { RootStackParamList } from "@/navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const greetingFor = (d: Date) => {
  const h = d.getHours();
  if (h < 12) return "Bom dia!";
  if (h < 18) return "Boa tarde!";
  return "Boa noite!";
};

export default function HomeScreen() {
  const { profile } = useAuth();
  const nav = useNavigation<Nav>();
  const [missionsToday, setMissionsToday] = useState(0);
  const [doneToday, setDoneToday] = useState(0);
  const [unread, setUnread] = useState(0);
  const [letMsg, setLetMsg] = useState(
    "Bom diaaaa, maravilhosa! Lembre-se: pequenos passos consistentes mudam tudo. Bora pra mais um dia?"
  );

  const day = getCurrentDay(profile?.challenge_start_date ?? null);
  const firstName = (profile?.full_name || "").split(" ")[0] || "voce";
  const streak = profile?.streak_atual ?? 0;
  const xp = profile?.xp_total ?? 0;

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [m, c, cfg, n] = await Promise.all([
        supabase
          .from("missions")
          .select("id", { count: "exact", head: true })
          .eq("dia_numero", day)
          .eq("ativo", true),
        supabase
          .from("checkins")
          .select("id", { count: "exact", head: true })
          .eq("user_id", profile.id)
          .eq("dia_numero", day),
        supabase
          .from("configuracoes_app")
          .select("valor")
          .eq("chave", "mensagem_let_home")
          .maybeSingle(),
        supabase
          .from("notificacoes")
          .select("id", { count: "exact", head: true })
          .eq("user_id", profile.id)
          .eq("lida", false),
      ]);
      setMissionsToday(m.count ?? 0);
      setDoneToday(c.count ?? 0);
      if (cfg.data?.valor) setLetMsg(cfg.data.valor);
      setUnread(n.count ?? 0);
    })();
  }, [profile, day]);

  const pct =
    missionsToday > 0 ? Math.round((doneToday / missionsToday) * 100) : 0;

  const quickActions = [
    { screen: "Main" as const, tab: "Dieta", emoji: "🍎", label: "Meu Cardapio" },
    { screen: "Main" as const, tab: "Chat", emoji: "💬", label: "Fale com a Let" },
    { screen: "Audios" as const, emoji: "🎙️", label: "Audios Diarios" },
    { screen: "Missoes" as const, emoji: "🎯", label: "Missoes do dia" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pb-5 pt-6">
          <TouchableOpacity
            onPress={() => nav.navigate("Perfil")}
            className="flex-row items-center gap-3"
          >
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary">
              <Text className="text-lg font-bold text-primary-foreground">
                {firstName[0]?.toUpperCase() || "?"}
              </Text>
            </View>
            <View>
              <Text className="text-sm text-muted-foreground">
                {greetingFor(new Date())}
              </Text>
              <Text className="text-[22px] font-bold text-foreground">
                Ola, {firstName}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => nav.navigate("Notificacoes")}
            className="relative h-11 w-11 items-center justify-center rounded-2xl bg-muted"
          >
            <Bell size={20} strokeWidth={2.2} color="#0F172A" />
            {unread > 0 && (
              <View className="absolute -right-1 -top-1 h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1">
                <Text className="text-[10px] font-bold text-primary-foreground">
                  {unread > 9 ? "9+" : unread}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View className="gap-4 px-5">
          {/* Hero - Desafio Diario */}
          <View className="overflow-hidden rounded-3xl bg-secondary p-6">
            <View className="flex-row items-start justify-between">
              <View>
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-lg">⚡</Text>
                  <Text className="text-xs text-secondary-foreground/90">
                    Desafio Diario
                  </Text>
                </View>
                <Text className="mt-3 text-[34px] font-bold leading-none text-secondary-foreground">
                  Dia {Math.min(day, 15)}{" "}
                  <Text className="text-xl font-medium opacity-80">de 15</Text>
                </Text>
              </View>
              <Text className="text-4xl font-extrabold text-secondary-foreground">
                {pct}%
              </Text>
            </View>

            {/* Progress bar */}
            <View className="mt-5 h-2 w-full overflow-hidden rounded-full bg-white/25">
              <View
                className="h-full rounded-full bg-white"
                style={{ width: `${pct}%` }}
              />
            </View>
            <Text className="mt-3 text-xs text-secondary-foreground/90">
              <Text className="font-bold">{doneToday} missoes</Text> concluidas
              hoje.
            </Text>
          </View>

          {/* Quick actions 2x2 */}
          <View className="flex-row flex-wrap gap-3">
            {quickActions.map(({ emoji, label, screen }) => (
              <TouchableOpacity
                key={label}
                onPress={() => nav.navigate(screen as any)}
                className="w-[48%] rounded-2xl bg-card p-4 shadow-sm"
                activeOpacity={0.9}
              >
                <View className="flex-row items-start justify-between">
                  <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary">
                    <Text className="text-lg">{emoji}</Text>
                  </View>
                  <Text className="text-muted-foreground">→</Text>
                </View>
                <Text className="mt-8 text-[15px] font-semibold text-foreground">
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sua jornada / Pontuacao */}
          <View className="flex-row items-center justify-between rounded-2xl bg-primary/15 px-5 py-4">
            <View>
              <View className="flex-row items-center gap-1.5">
                <Text>🔥</Text>
                <Text className="text-xs text-foreground/80">Sua Jornada</Text>
              </View>
              <Text className="mt-1 text-xl font-bold text-foreground">
                {streak} {streak === 1 ? "Dia Seguido" : "Dias Seguidos"}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-xs text-foreground/80">Pontuacao</Text>
              <Text className="text-xl font-bold text-foreground">
                {xp} XP
              </Text>
            </View>
          </View>

          {/* Mensagem do Dia */}
          <View className="mb-4 rounded-2xl bg-card p-4 shadow-sm">
            <View className="flex-row gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-secondary">
                <Text className="text-sm font-bold text-secondary-foreground">
                  L
                </Text>
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-[15px] font-bold text-foreground">
                    LETClub
                  </Text>
                  <Text>✅</Text>
                </View>
                <View className="mt-1 flex-row items-center gap-1.5">
                  <Heart size={14} color="#7C3AED" fill="#7C3AED" />
                  <Text className="text-xs text-muted-foreground">
                    Mensagem do Dia
                  </Text>
                </View>
                <Text className="mt-3 text-sm leading-relaxed text-foreground">
                  {letMsg}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
