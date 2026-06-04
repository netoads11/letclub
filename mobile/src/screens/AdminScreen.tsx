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
import { ChevronLeft, Users, Target, Award, MessageCircle, LogOut } from "lucide-react-native";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Stats = {
  totalUsers: number;
  totalMissions: number;
  totalCheckins: number;
  totalPosts: number;
  totalBadges: number;
};

export default function AdminScreen() {
  const { signOut } = useAuth();
  const nav = useNavigation();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const [users, missions, checkins, posts, badges] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("missions").select("id", { count: "exact", head: true }),
        supabase.from("checkins").select("id", { count: "exact", head: true }),
        supabase.from("posts_comunidade").select("id", { count: "exact", head: true }),
        supabase.from("badges").select("id", { count: "exact", head: true }),
      ]);
      if (users.error) console.log("[ADMIN] profiles error:", users.error.message, users.error.code);
      if (missions.error) console.log("[ADMIN] missions error:", missions.error.message, missions.error.code);
      if (checkins.error) console.log("[ADMIN] checkins error:", checkins.error.message, checkins.error.code);
      if (posts.error) console.log("[ADMIN] posts_comunidade error:", posts.error.message, posts.error.code);
      if (badges.error) console.log("[ADMIN] badges error:", badges.error.message, badges.error.code);
      setStats({
        totalUsers: users.count ?? 0,
        totalMissions: missions.count ?? 0,
        totalCheckins: checkins.count ?? 0,
        totalPosts: posts.count ?? 0,
        totalBadges: badges.count ?? 0,
      });
    })();
  }, []);

  const cards = stats
    ? [
        { label: "Alunas", value: stats.totalUsers, icon: Users, color: "#BFDB1E" },
        { label: "Missoes", value: stats.totalMissions, icon: Target, color: "#22C55E" },
        { label: "Check-ins", value: stats.totalCheckins, icon: Target, color: "#F59E0B" },
        { label: "Posts", value: stats.totalPosts, icon: MessageCircle, color: "#3B82F6" },
        { label: "Badges", value: stats.totalBadges, icon: Award, color: "#EF4444" },
      ]
    : [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center justify-between px-4 py-4">
        <View className="flex-row items-center gap-2">
          <TouchableOpacity onPress={() => nav.goBack()} className="-ml-1 p-1">
            <ChevronLeft size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-foreground">Admin</Text>
        </View>
        <TouchableOpacity onPress={signOut} className="flex-row items-center gap-1">
          <LogOut size={16} color="#EF4444" />
          <Text className="text-sm text-destructive">Sair</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="px-4" showsVerticalScrollIndicator={false}>
        {!stats ? (
          <View className="items-center py-20">
            <ActivityIndicator size="large" color="#BFDB1E" />
          </View>
        ) : (
          <>
            <Text className="mb-3 text-[11px] uppercase tracking-widest text-muted-foreground">
              Dashboard
            </Text>
            <View className="flex-row flex-wrap gap-3 pb-6">
              {cards.map((c) => {
                const Icon = c.icon;
                return (
                  <View
                    key={c.label}
                    className="w-[48%] rounded-2xl border border-border bg-card p-4 shadow-sm"
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: c.color + "20" }}>
                      <Icon size={20} color={c.color} />
                    </View>
                    <Text className="mt-3 text-2xl font-bold text-foreground">{c.value}</Text>
                    <Text className="mt-1 text-xs text-muted-foreground">{c.label}</Text>
                  </View>
                );
              })}
            </View>

            <View className="mb-6 rounded-2xl border border-border bg-card p-5">
              <Text className="text-sm text-muted-foreground">
                O painel admin completo esta disponivel na versao web.
                Aqui você pode acompanhar os numeros principais.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
