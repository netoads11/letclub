import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { ChevronLeft, Bell } from "lucide-react-native";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export default function NotificacoesScreen() {
  const { profile } = useAuth();
  const nav = useNavigation();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data, error: selErr } = await supabase
        .from("notificacoes")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });
      if (selErr) console.log("[NOTIFICACOES] notificacoes error:", selErr.message, selErr.code);
      setItems(data ?? []);
      const unread = (data ?? []).filter((n) => !n.lida).map((n) => n.id);
      if (unread.length) {
        const { error: updErr } = await supabase.from("notificacoes").update({ lida: true }).in("id", unread);
        if (updErr) console.log("[NOTIFICACOES] notificações update error:", updErr.message, updErr.code);
      }
    })();
  }, [profile]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center gap-3 px-5 py-4">
        <TouchableOpacity onPress={() => nav.goBack()} className="rounded-full bg-card p-2">
          <ChevronLeft size={20} color="#1A1A1A" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-foreground">Notificações</Text>
      </View>

      <ScrollView className="px-5" showsVerticalScrollIndicator={false}>
        {items.length === 0 && (
          <Text className="py-10 text-center text-sm text-muted-foreground">
            Sem notificações ainda.
          </Text>
        )}
        <View className="gap-2 pb-6">
          {items.map((n) => (
            <View
              key={n.id}
              className={`rounded-xl border p-4 ${
                !n.lida ? "border-primary/40 bg-primary/5" : "border-border bg-card"
              }`}
            >
              <View className="flex-row items-start gap-3">
                <Bell size={16} color="#BFDB1E" style={{ marginTop: 2 }} />
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">{n.titulo}</Text>
                  <Text className="mt-1 text-xs text-muted-foreground">{n.mensagem}</Text>
                  <Text className="mt-2 text-[10px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("pt-BR")}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
