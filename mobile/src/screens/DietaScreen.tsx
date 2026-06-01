import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Plus, Flame, Camera, X } from "lucide-react-native";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getCurrentDay } from "@/lib/challenge";
import type { RootStackParamList } from "@/navigation/types";
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const mealLabel: Record<string, string> = {
  cafe: "Cafe da Manha",
  almoco: "Almoco",
  lanche: "Lanche",
  jantar: "Jantar",
  cha: "Cha",
};
const mealOrder = ["cafe", "almoco", "lanche", "jantar", "cha"];

const headerLabel = (d: Date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (same(d, today)) return "Hoje";
  if (same(d, yesterday)) return "Ontem";
  return d.toLocaleDateString("pt-BR", { weekday: "long" });
};

export default function DietaScreen() {
  const { profile } = useAuth();
  const nav = useNavigation<Nav>();
  const [logs, setLogs] = useState<any[]>([]);
  const [sugestoes, setSugestoes] = useState<any[]>([]);
  const [selectedDate] = useState<Date>(new Date());
  const [openAdd, setOpenAdd] = useState(false);

  const day = getCurrentDay(profile?.challenge_start_date ?? null);

  const [tipo, setTipo] = useState("almoco");
  const [nome, setNome] = useState("");
  const [kcal, setKcal] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const startOfDay = useMemo(() => {
    const d = new Date(selectedDate);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, [selectedDate]);
  const endOfDay = useMemo(() => {
    const d = new Date(selectedDate);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }, [selectedDate]);

  const loadLogs = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("refeicoes_log")
      .select("*")
      .eq("user_id", profile.id)
      .gte("registrado_em", startOfDay)
      .lte("registrado_em", endOfDay)
      .order("registrado_em");
    const list = (data ?? []).sort(
      (a: any, b: any) => mealOrder.indexOf(a.tipo_refeicao) - mealOrder.indexOf(b.tipo_refeicao)
    );
    setLogs(list);
  };

  useEffect(() => { loadLogs(); }, [profile, startOfDay, endOfDay]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase
        .from("receitas")
        .select("*")
        .eq("ativo", true)
        .or(`dia_numero.is.null,dia_numero.eq.${day}`);
      let list = data ?? [];
      const restr = profile?.restricoes_alimentares ?? [];
      if (restr.length) {
        list = list.filter((r: any) =>
          restr.every((x: string) => (r.restricoes_compativeis ?? []).includes(x))
        );
      }
      list.sort((a: any, b: any) => mealOrder.indexOf(a.tipo_refeicao) - mealOrder.indexOf(b.tipo_refeicao));
      setSugestoes(list.slice(0, 4));
    })();
  }, [profile, day]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const resetForm = () => {
    setTipo("almoco");
    setNome("");
    setKcal("");
    setImageUri(null);
  };

  const salvar = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      let imagem_url: string | null = null;
      if (imageUri) {
        const ext = imageUri.split(".").pop() || "jpg";
        const path = `${profile.id}/${Date.now()}.${ext}`;
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const { error: upErr } = await supabase.storage.from("refeicoes").upload(path, blob, { upsert: true });
        if (upErr) throw upErr;
        imagem_url = supabase.storage.from("refeicoes").getPublicUrl(path).data.publicUrl;
      }
      const registrado_em = new Date().toISOString();
      const { error } = await supabase.from("refeicoes_log").insert({
        user_id: profile.id,
        tipo_refeicao: tipo,
        nome: nome || null,
        kcal: kcal ? Number(kcal) : null,
        imagem_url,
        registrado_em,
      });
      if (error) throw error;
      Toast.show({ type: "success", text1: "Refeicao registrada" });
      resetForm();
      setOpenAdd(false);
      loadLogs();
    } catch (e: any) {
      Toast.show({ type: "error", text1: e.message || "Erro ao salvar" });
    } finally {
      setSaving(false);
    }
  };

  const formatHora = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}h${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-5 pb-5 pt-7">
          <View className="flex-row items-end justify-between gap-3">
            <View>
              <Text className="text-sm text-muted-foreground">Meu Cardapio</Text>
              <Text className="mt-0.5 text-[28px] font-bold leading-tight text-foreground">
                Historico de{"\n"}alimentacao
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setOpenAdd(true)}
              className="h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-lg"
            >
              <Plus size={20} strokeWidth={2.6} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="gap-6 px-5 pb-6">
          <View>
            <View className="mb-3 flex-row items-end justify-between">
              <Text className="text-lg font-bold capitalize text-foreground">
                {headerLabel(selectedDate)}
              </Text>
            </View>

            {logs.length === 0 ? (
              <View className="items-center rounded-2xl bg-card p-6 shadow-sm">
                <Text className="text-center text-sm text-muted-foreground">
                  Nenhuma refeicao registrada nesta data.
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {logs.map((r) => (
                  <View key={r.id} className="flex-row items-center gap-4 rounded-2xl bg-card p-4 shadow-sm">
                    <View className="flex-1">
                      <Text className="text-[17px] font-semibold text-foreground">
                        {mealLabel[r.tipo_refeicao] ?? r.nome ?? "Refeicao"}
                      </Text>
                      {r.nome && mealLabel[r.tipo_refeicao] && (
                        <Text className="text-xs text-muted-foreground">{r.nome}</Text>
                      )}
                      {r.kcal != null && (
                        <View className="mt-1.5 flex-row items-center gap-1.5">
                          <Flame size={20} color="#1E1B4B" fill="#1E1B4B" />
                          <Text className="text-[22px] font-bold text-foreground">{r.kcal}</Text>
                          <Text className="text-sm text-muted-foreground">kcal</Text>
                        </View>
                      )}
                      <Text className="mt-2 text-xs text-muted-foreground">{formatHora(r.registrado_em)}</Text>
                    </View>
                    {r.imagem_url && (
                      <Image source={{ uri: r.imagem_url }} className="h-16 w-16 rounded-2xl" resizeMode="cover" />
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {sugestoes.length > 0 && (
            <View>
              <Text className="mb-3 text-lg font-bold text-foreground">Sugestoes do dia</Text>
              <View className="gap-3">
                {sugestoes.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    onPress={() => nav.navigate("ReceitaDetalhe", { id: r.id })}
                    className="flex-row items-center gap-4 rounded-2xl bg-card p-4 shadow-sm"
                    activeOpacity={0.9}
                  >
                    <View className="flex-1">
                      <Text className="text-[17px] font-semibold text-foreground">
                        {mealLabel[r.tipo_refeicao] ?? r.nome}
                      </Text>
                      <Text className="mt-1 text-xs text-muted-foreground">{r.nome}</Text>
                    </View>
                    {r.imagem_url && (
                      <Image source={{ uri: r.imagem_url }} className="h-16 w-16 rounded-2xl" resizeMode="cover" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal adicionar refeicao */}
      <Modal visible={openAdd} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-3xl bg-card px-5 pb-8 pt-3">
            <View className="mb-4 items-center">
              <View className="h-1.5 w-12 rounded-full bg-muted" />
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold text-foreground">Nova refeicao</Text>
              <TouchableOpacity onPress={() => { setOpenAdd(false); resetForm(); }}>
                <X size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {/* Photo picker */}
            <TouchableOpacity
              onPress={pickImage}
              className="mt-4 h-40 w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted"
            >
              {imageUri ? (
                <Image source={{ uri: imageUri }} className="h-full w-full" resizeMode="cover" />
              ) : (
                <View className="items-center">
                  <Camera size={28} color="#64748B" />
                  <Text className="mt-1 text-xs text-muted-foreground">Toque para adicionar foto</Text>
                </View>
              )}
            </TouchableOpacity>

            <View className="mt-4 gap-3">
              {/* Meal type selector */}
              <View>
                <Text className="mb-1.5 text-xs text-muted-foreground">Tipo de refeicao</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {mealOrder.map((k) => (
                      <TouchableOpacity
                        key={k}
                        onPress={() => setTipo(k)}
                        className={`rounded-xl border px-3 py-2 ${
                          tipo === k ? "border-primary bg-primary/10" : "border-border bg-card"
                        }`}
                      >
                        <Text className={`text-sm ${tipo === k ? "text-primary font-medium" : "text-foreground"}`}>
                          {mealLabel[k]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View>
                <Text className="mb-1.5 text-xs text-muted-foreground">Nome (opcional)</Text>
                <TextInput
                  value={nome}
                  onChangeText={setNome}
                  placeholder="Ex: Omelete com queijo"
                  placeholderTextColor="#64748B"
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                />
              </View>

              <View>
                <Text className="mb-1.5 text-xs text-muted-foreground">Calorias (opcional)</Text>
                <TextInput
                  value={kcal}
                  onChangeText={setKcal}
                  placeholder="kcal"
                  placeholderTextColor="#64748B"
                  keyboardType="number-pad"
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                />
              </View>

              <TouchableOpacity
                onPress={salvar}
                disabled={saving}
                className={`items-center rounded-xl bg-primary py-3.5 ${saving ? "opacity-50" : ""}`}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-sm font-semibold text-primary-foreground">Salvar refeicao</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
