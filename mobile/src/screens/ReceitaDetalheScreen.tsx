import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { ChevronLeft, Heart, Clock } from "lucide-react-native";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { RootStackParamList } from "@/navigation/types";
import Toast from "react-native-toast-message";

type Route = RouteProp<RootStackParamList, "ReceitaDetalhe">;

export default function ReceitaDetalheScreen() {
  const { profile } = useAuth();
  const nav = useNavigation();
  const route = useRoute<Route>();
  const { id } = route.params;

  const [r, setR] = useState<any>(null);
  const [fav, setFav] = useState(false);

  useEffect(() => {
    if (!id || !profile) return;
    (async () => {
      const [rr, fr] = await Promise.all([
        supabase.from("receitas").select("*").eq("id", id).maybeSingle(),
        supabase.from("receitas_favoritas").select("id").eq("user_id", profile.id).eq("receita_id", id).maybeSingle(),
      ]);
      setR(rr.data);
      setFav(!!fr.data);
    })();
  }, [id, profile]);

  const toggleFav = async () => {
    if (!profile || !id) return;
    if (fav) {
      await supabase.from("receitas_favoritas").delete().eq("user_id", profile.id).eq("receita_id", id);
      setFav(false);
    } else {
      await supabase.from("receitas_favoritas").insert({ user_id: profile.id, receita_id: id });
      setFav(true);
      Toast.show({ type: "success", text1: "Salva nos favoritos" });
    }
  };

  if (!r) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-4">
          <TouchableOpacity onPress={() => nav.goBack()} className="rounded-full bg-card p-2">
            <ChevronLeft size={20} color="#0F172A" />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleFav} className="rounded-full bg-card p-2">
            <Heart size={20} color={fav ? "#7C3AED" : "#0F172A"} fill={fav ? "#7C3AED" : "none"} />
          </TouchableOpacity>
        </View>

        <View className="px-5">
          {r.imagem_url ? (
            <Image
              source={{ uri: r.imagem_url }}
              className="mb-4 h-[200px] w-full rounded-2xl"
              resizeMode="cover"
            />
          ) : (
            <View className="mb-4 h-[200px] w-full items-center justify-center rounded-2xl bg-primary/10">
              <Text className="text-5xl opacity-60">🍽️</Text>
            </View>
          )}

          <Text className="text-2xl font-bold text-foreground">{r.nome}</Text>
          <View className="mt-2 flex-row items-center gap-2">
            <Clock size={16} color="#64748B" />
            <Text className="text-xs text-muted-foreground">{r.tempo_preparo} minutos</Text>
          </View>

          <Text className="mt-6 text-lg font-bold text-foreground">Ingredientes</Text>
          <View className="mt-2 gap-2">
            {(r.ingredientes ?? []).map((ing: any, idx: number) => (
              <View key={idx} className="flex-row items-start gap-2 rounded-xl bg-card p-3">
                <Text className="text-primary">•</Text>
                <Text className="text-sm text-foreground">
                  <Text className="font-medium">{ing.nome}</Text>
                  <Text className="text-muted-foreground"> — {ing.quantidade}</Text>
                </Text>
              </View>
            ))}
          </View>

          <Text className="mt-6 text-lg font-bold text-foreground">Modo de preparo</Text>
          <View className="mb-10 mt-2 gap-3">
            {(r.modo_preparo ?? []).map((p: string, idx: number) => (
              <View key={idx} className="flex-row gap-3 rounded-xl bg-card p-3">
                <Text className="font-bold text-primary">{idx + 1}.</Text>
                <Text className="flex-1 text-sm text-foreground">{p}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
