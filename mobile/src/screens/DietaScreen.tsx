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
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Plus, Flame, Camera, X } from "lucide-react-native";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getCurrentDay } from "@/lib/challenge";
import type { RootStackParamList } from "@/navigation/types";
import { showToast } from "@/lib/toast";
import * as ImagePicker from "expo-image-picker";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const mealLabel: Record<string, string> = {
  cafe: "Café da Manhã",
  almoco: "Almoço",
  lanche: "Lanche",
  jantar: "Jantar",
  cha: "Chá",
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
  const [proteinas, setProteinas] = useState("");
  const [carboidratos, setCarboidratos] = useState("");
  const [gorduras, setGorduras] = useState("");
  const [pesoGramas, setPesoGramas] = useState("");
  const [ingredientes, setIngredientes] = useState<{ nome: string; peso: string }[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
    const { data, error: loadErr } = await supabase
      .from("refeicoes_log")
      .select("*")
      .eq("user_id", profile.id)
      .gte("registrado_em", startOfDay)
      .lte("registrado_em", endOfDay)
      .order("registrado_em");
    if (loadErr) console.log("[DIETA] refeicoes_log error:", loadErr.message, loadErr.code);
    const list = (data ?? []).sort(
      (a: any, b: any) => mealOrder.indexOf(a.tipo_refeicao) - mealOrder.indexOf(b.tipo_refeicao)
    );
    setLogs(list);
  };

  const totalKcalHoje = useMemo(() => logs.reduce((sum, r) => sum + (r.kcal ?? 0), 0), [logs]);
  const metaCalorias = (profile as any)?.meta_calorias ?? 1500;
  const progressPct = Math.min(totalKcalHoje / metaCalorias, 1);

  useEffect(() => { loadLogs(); }, [profile, startOfDay, endOfDay]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data, error: recErr } = await supabase
        .from("receitas")
        .select("*")
        .eq("ativo", true)
        .or(`dia_numero.is.null${!isNaN(day) ? `,dia_numero.eq.${day}` : ""}`);
      if (recErr) console.log("[DIETA] receitas error:", recErr.message, recErr.code);
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
      mediaTypes: ["images"],
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
    setProteinas("");
    setCarboidratos("");
    setGorduras("");
    setPesoGramas("");
    setIngredientes([]);
    setImageUri(null);
    setAnalyzingPhoto(false);
    setShowDetails(false);
  };

  const salvar = async () => {
    if (!profile) return;
    if (!imageUri && !nome && !kcal) {
      showToast("error", "Adicione uma foto ou preencha os dados");
      return;
    }
    setSaving(true);
    try {
      let imagem_url: string | null = null;
      if (imageUri) {
        const ext = imageUri.split(".").pop() || "jpg";
        const path = `${profile.id}/${Date.now()}.${ext}`;
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const { error: upErr } = await supabase.storage.from("refeicoes").upload(path, blob, { upsert: true });
        if (upErr) { console.log("[DIETA] storage refeicoes upload error:", upErr.message); throw upErr; }
        imagem_url = supabase.storage.from("refeicoes").getPublicUrl(path).data.publicUrl;
      }
      const registrado_em = new Date().toISOString();
      const { error } = await supabase.from("refeicoes_log").insert({
        user_id: profile.id,
        tipo_refeicao: tipo,
        nome: nome || null,
        kcal: Number(kcal),
        proteinas: proteinas ? Number(proteinas) : null,
        carboidratos: carboidratos ? Number(carboidratos) : null,
        gorduras: gorduras ? Number(gorduras) : null,
        peso_gramas: pesoGramas ? Number(pesoGramas) : null,
        ingredientes: ingredientes.length > 0 ? ingredientes.map(i => ({ nome: i.nome, peso_g: Number(i.peso) || 0 })) : null,
        imagem_url,
        registrado_em,
      });
      if (error) { console.log("[DIETA] refeicoes_log insert error:", error.message, error.code); throw error; }
      showToast("success", "Refeição registrada");
      resetForm();
      setOpenAdd(false);
      loadLogs();
    } catch (e: any) {
      showToast("error", e.message || "Erro ao salvar");
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
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadLogs(); setRefreshing(false); }} tintColor="#BFDB1E" />}>
        <View className="px-5 pb-5 pt-7">
          <View className="flex-row items-end justify-between gap-3">
            <View>
              <Text className="text-sm text-muted-foreground">Meu Cardápio</Text>
              <Text className="mt-0.5 text-[28px] font-bold leading-tight text-foreground">
                Histórico de{"\n"}alimentação
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

        {/* Meta diaria */}
        <View className="mx-5 mb-4 rounded-2xl bg-card p-4 shadow-sm">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-foreground">Meta diaria</Text>
            <Text className="text-sm text-muted-foreground">{totalKcalHoje} / {metaCalorias} kcal</Text>
          </View>
          <View className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
            <View
              className={`h-3 rounded-full ${progressPct >= 1 ? "bg-destructive" : "bg-primary"}`}
              style={{ width: `${Math.round(progressPct * 100)}%` }}
            />
          </View>
          <Text className="mt-1.5 text-xs text-muted-foreground">
            {totalKcalHoje >= metaCalorias
              ? "Meta atingida!"
              : `Faltam ${metaCalorias - totalKcalHoje} kcal`}
          </Text>
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
                  Nenhuma refeição registrada nesta data.
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
                          <Flame size={20} color="#B07664" fill="#B07664" />
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
              <Text className="mb-3 text-lg font-bold text-foreground">Sugestões do dia</Text>
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
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1 justify-end bg-black/50">
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }} keyboardShouldPersistTaps="handled">
          <View className="rounded-t-3xl bg-card px-5 pb-8 pt-3">
            <View className="mb-4 items-center">
              <View className="h-1.5 w-12 rounded-full bg-muted" />
            </View>

            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xl font-bold text-foreground">Registrar refeição</Text>
                <Text className="text-xs text-muted-foreground">Tire uma foto ou preencha manualmente</Text>
              </View>
              <TouchableOpacity onPress={() => { setOpenAdd(false); resetForm(); }}>
                <X size={20} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            {/* Photo - hero area */}
            <TouchableOpacity
              onPress={pickImage}
              activeOpacity={0.9}
              className="mt-4 h-48 w-full items-center justify-center overflow-hidden rounded-2xl bg-secondary"
            >
              {imageUri ? (
                <View className="h-full w-full">
                  <Image source={{ uri: imageUri }} className="h-full w-full" resizeMode="cover" />
                  {analyzingPhoto && (
                    <View className="absolute inset-0 items-center justify-center bg-black/40">
                      <ActivityIndicator color="#BFDB1E" size="large" />
                      <Text className="mt-2 text-xs font-medium text-white">Analisando refeição...</Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={pickImage} className="absolute bottom-3 right-3 rounded-full bg-black/50 p-2">
                    <Camera size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="items-center">
                  <View className="h-16 w-16 items-center justify-center rounded-full bg-white/20">
                    <Camera size={32} color="#fff" />
                  </View>
                  <Text className="mt-3 text-sm font-semibold text-secondary-foreground">Tirar foto da refeição</Text>
                  <Text className="mt-1 text-[11px] text-secondary-foreground/70">Em breve a IA analisa tudo automaticamente</Text>
                </View>
              )}
            </TouchableOpacity>

            <View className="mt-4 gap-3">
              {/* Meal type - emoji pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {[
                    { k: "cafe", emoji: "☕", l: "Café" },
                    { k: "almoco", emoji: "🍛", l: "Almoço" },
                    { k: "lanche", emoji: "🍎", l: "Lanche" },
                    { k: "jantar", emoji: "🥗", l: "Jantar" },
                    { k: "cha", emoji: "🍵", l: "Chá" },
                  ].map(({ k, emoji, l }) => (
                    <TouchableOpacity
                      key={k}
                      onPress={() => setTipo(k)}
                      activeOpacity={0.9}
                      className={`flex-row items-center gap-1.5 rounded-full border px-4 py-2.5 ${
                        tipo === k ? "border-primary bg-primary" : "border-border bg-card"
                      }`}
                    >
                      <Text className="text-base">{emoji}</Text>
                      <Text className={`text-sm font-medium ${tipo === k ? "text-primary-foreground" : "text-foreground"}`}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Nome da refeicao */}
              <TextInput
                value={nome}
                onChangeText={setNome}
                placeholder="O que você comeu? Ex: Omelete com queijo"
                placeholderTextColor="#888888"
                className="rounded-2xl border border-border bg-card px-4 py-3.5 text-sm text-foreground"
              />

              {/* Detalhes nutricionais - expansivel */}
              <TouchableOpacity
                onPress={() => setShowDetails(!showDetails)}
                activeOpacity={0.9}
                className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5"
              >
                <View className="flex-row items-center gap-2">
                  <Text className="text-base">📊</Text>
                  <Text className="text-sm text-foreground">Detalhes nutricionais</Text>
                  {kcal ? <Text className="text-xs text-primary font-medium">{kcal} kcal</Text> : null}
                </View>
                <Text className="text-muted-foreground">{showDetails ? "▲" : "▼"}</Text>
              </TouchableOpacity>

              {showDetails && (
                <View className="gap-3 rounded-2xl border border-border bg-muted/50 p-4">
                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <Text className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Calorias</Text>
                      <TextInput value={kcal} onChangeText={setKcal} placeholder="kcal" placeholderTextColor="#888888" keyboardType="number-pad" className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground" />
                    </View>
                    <View className="flex-1">
                      <Text className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Peso (g)</Text>
                      <TextInput value={pesoGramas} onChangeText={setPesoGramas} placeholder="gramas" placeholderTextColor="#888888" keyboardType="number-pad" className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground" />
                    </View>
                  </View>
                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <Text className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Proteína</Text>
                      <TextInput value={proteinas} onChangeText={setProteinas} placeholder="g" placeholderTextColor="#888888" keyboardType="number-pad" className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground" />
                    </View>
                    <View className="flex-1">
                      <Text className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Carbos</Text>
                      <TextInput value={carboidratos} onChangeText={setCarboidratos} placeholder="g" placeholderTextColor="#888888" keyboardType="number-pad" className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground" />
                    </View>
                    <View className="flex-1">
                      <Text className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Gordura</Text>
                      <TextInput value={gorduras} onChangeText={setGorduras} placeholder="g" placeholderTextColor="#888888" keyboardType="number-pad" className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground" />
                    </View>
                  </View>

                  {/* Ingredientes */}
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[10px] uppercase tracking-wide text-muted-foreground">Ingredientes</Text>
                    <TouchableOpacity onPress={() => setIngredientes([...ingredientes, { nome: "", peso: "" }])} activeOpacity={0.8} className="rounded-full bg-primary px-3 py-1">
                      <Text className="text-[10px] font-bold text-primary-foreground">+ ADICIONAR</Text>
                    </TouchableOpacity>
                  </View>
                  {ingredientes.map((ing, idx) => (
                    <View key={idx} className="flex-row gap-2 items-center">
                      <TextInput value={ing.nome} onChangeText={(v) => { const copy = [...ingredientes]; copy[idx].nome = v; setIngredientes(copy); }} placeholder="Ingrediente" placeholderTextColor="#888888" className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground" />
                      <TextInput value={ing.peso} onChangeText={(v) => { const copy = [...ingredientes]; copy[idx].peso = v; setIngredientes(copy); }} placeholder="g" placeholderTextColor="#888888" keyboardType="number-pad" className="w-16 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground" />
                      <TouchableOpacity onPress={() => setIngredientes(ingredientes.filter((_, i) => i !== idx))}><X size={14} color="#888888" /></TouchableOpacity>
                    </View>
                  ))}
                  {ingredientes.length === 0 && (
                    <Text className="text-[10px] text-muted-foreground/60">Em breve: a IA preenche tudo automaticamente pela foto</Text>
                  )}
                </View>
              )}

              {/* Save button */}
              <TouchableOpacity
                onPress={salvar}
                disabled={saving}
                activeOpacity={0.9}
                className={`flex-row items-center justify-center gap-2 rounded-2xl bg-primary py-4 ${saving ? "opacity-50" : ""}`}
              >
                {saving ? (
                  <ActivityIndicator color="#1A1A1A" />
                ) : (
                  <>
                    <Text className="text-base">✅</Text>
                    <Text className="text-base font-bold text-primary-foreground">Registrar refeição</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text className="text-center text-[10px] text-muted-foreground">Em breve: tire a foto e a IA preenche tudo por você</Text>
            </View>
          </View>
        </ScrollView>
        </View>
        </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
