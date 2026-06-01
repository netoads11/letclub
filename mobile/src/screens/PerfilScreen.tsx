import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import {
  ChevronLeft,
  MoreHorizontal,
  LogOut,
  Lock,
  Check,
} from "lucide-react-native";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getCurrentDay } from "@/lib/challenge";
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";

const RESTRICOES = ["vegetariana", "lactose", "gluten", "gestante"];

export default function PerfilScreen() {
  const { profile, refreshProfile, signOut, user } = useAuth();
  const nav = useNavigation();
  const [pesos, setPesos] = useState<any[]>([]);
  const [badges, setBadges] = useState<string[]>([]);
  const [allBadges, setAllBadges] = useState<any[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  const [name, setName] = useState(profile?.full_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [notif, setNotif] = useState(profile?.notificacoes_ativas ?? true);
  const [restricoes, setRestricoes] = useState<string[]>(profile?.restricoes_alimentares ?? []);
  const [newPeso, setNewPeso] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (!profile) return;
    setName(profile.full_name);
    setAvatarUrl(profile.avatar_url);
    setNotif(profile.notificacoes_ativas);
    setRestricoes(profile.restricoes_alimentares ?? []);
    (async () => {
      const [p, ub, b] = await Promise.all([
        supabase.from("pesos_historico").select("*").eq("user_id", profile.id).order("registrado_em"),
        supabase.from("user_badges").select("badge_id").eq("user_id", profile.id),
        supabase.from("badges").select("*").eq("ativo", true),
      ]);
      setPesos((p.data ?? []).map((x: any) => ({ data: x.registrado_em?.slice(5) ?? "", peso: Number(x.peso) })));
      setBadges((ub.data ?? []).map((x: any) => x.badge_id));
      setAllBadges(b.data ?? []);
    })();
  }, [profile]);

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#7C3AED" />
      </SafeAreaView>
    );
  }

  const handle = "@" + (profile.email?.split("@")[0] || profile.full_name.split(" ")[0].toLowerCase()).slice(0, 14);
  const streak = profile.streak_atual;
  const xp = profile.xp_total;

  const uploadAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    setUploading(true);
    try {
      const uri = result.assets[0].uri;
      const ext = uri.split(".").pop() || "jpg";
      const path = `${profile.id}/${Date.now()}.${ext}`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", profile.id);
      await refreshProfile();
      Toast.show({ type: "success", text1: "Foto atualizada" });
    } catch (e: any) {
      Toast.show({ type: "error", text1: e.message ?? "Erro ao enviar foto" });
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async () => {
    const { error } = await supabase.from("profiles").update({
      full_name: name,
      avatar_url: avatarUrl,
      notificacoes_ativas: notif,
      restricoes_alimentares: restricoes,
    }).eq("id", profile.id);
    if (error) return Toast.show({ type: "error", text1: error.message });
    await refreshProfile();
    Toast.show({ type: "success", text1: "Perfil atualizado" });
  };

  const logPeso = async () => {
    const n = parseFloat(newPeso);
    if (!n) return;
    await supabase.from("pesos_historico").insert({ user_id: profile.id, peso: n });
    await supabase.from("profiles").update({ peso_atual: n }).eq("id", profile.id);
    await refreshProfile();
    setNewPeso("");
    Toast.show({ type: "success", text1: "Peso registrado" });
  };

  const updatePassword = async () => {
    if (!newPassword || newPassword.length < 6) return Toast.show({ type: "error", text1: "Minimo 6 caracteres" });
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return Toast.show({ type: "error", text1: error.message });
    setNewPassword("");
    Toast.show({ type: "success", text1: "Senha atualizada" });
  };

  const handleLogout = () => {
    Alert.alert("Sair da conta?", "Voce precisara entrar novamente.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => signOut() },
    ]);
  };

  const toggleRestricao = (r: string) => {
    setRestricoes((p) => p.includes(r) ? p.filter((x) => x !== r) : [...p, r]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-4">
          <View className="flex-row items-center gap-2">
            <TouchableOpacity onPress={() => nav.goBack()} className="-ml-1 p-1">
              <ChevronLeft size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text className="text-base font-bold text-foreground">{handle}</Text>
            <Text className="text-sm text-muted-foreground">Seu Perfil</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowSettings(true)}
            className="h-9 w-9 items-center justify-center rounded-full bg-muted"
          >
            <MoreHorizontal size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <View className="px-4">
          {/* Avatar card */}
          <View className="mt-2 items-center rounded-3xl bg-muted px-6 py-7">
            <TouchableOpacity onPress={uploadAvatar}>
              <View className="h-[140px] w-[140px] items-center justify-center overflow-hidden rounded-3xl border-4 border-primary bg-primary/20">
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} className="h-full w-full" resizeMode="cover" />
                ) : (
                  <Text className="text-4xl font-bold text-primary">
                    {profile.full_name[0]?.toUpperCase() || "?"}
                  </Text>
                )}
                {uploading && (
                  <View className="absolute inset-0 items-center justify-center bg-black/40">
                    <ActivityIndicator color="#fff" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <Text className="mt-4 text-2xl font-bold text-foreground">
              {profile.full_name || "Aluna"}
            </Text>
            <Text className="mt-1 text-sm text-muted-foreground">Membra Fundadora</Text>
          </View>

          {/* Weight stats */}
          <View className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-sm">
            <View className="flex-row">
              <View className="flex-1">
                <Text className="text-xs text-muted-foreground">Peso inicial</Text>
                <Text className="mt-1 text-2xl font-bold text-foreground">
                  {profile.peso_inicial ?? "—"} <Text className="text-sm text-muted-foreground">kg</Text>
                </Text>
              </View>
              <View className="flex-1 border-l border-border pl-3">
                <Text className="text-xs text-muted-foreground">Peso Atual</Text>
                <Text className="mt-1 text-2xl font-bold text-foreground">
                  {profile.peso_atual ?? "—"} <Text className="text-sm text-muted-foreground">kg</Text>
                </Text>
              </View>
              <View className="flex-1 border-l border-border pl-3">
                <Text className="text-xs text-muted-foreground">Meta</Text>
                <Text className="mt-1 text-2xl font-bold text-foreground">
                  {profile.meta_peso ?? "—"} <Text className="text-sm text-muted-foreground">kg</Text>
                </Text>
              </View>
            </View>
          </View>

          {/* Journey */}
          <View className="mt-4 flex-row items-center justify-between rounded-3xl bg-primary/15 p-5">
            <View>
              <Text className="text-sm text-foreground/80">🔥 Sua Jornada</Text>
              <Text className="mt-1 text-2xl font-bold text-foreground">
                {streak} Dias Seguidos
              </Text>
              <Text className="mt-1 text-xs text-muted-foreground">
                Recorde: <Text className="font-bold text-foreground">{profile.streak_recorde} dias</Text>
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-xs text-muted-foreground">XP Total</Text>
              <Text className="text-2xl font-bold text-foreground">{xp}</Text>
            </View>
          </View>

          {/* Badges */}
          {allBadges.length > 0 && (
            <View className="mt-6">
              <Text className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                Conquistas
              </Text>
              <View className="flex-row flex-wrap gap-2.5">
                {allBadges.map((b) => {
                  const u = badges.includes(b.id);
                  return (
                    <View
                      key={b.id}
                      className={`w-[31%] items-center rounded-xl border p-3 ${
                        u ? "border-primary/30 bg-card" : "border-border bg-card opacity-30"
                      }`}
                    >
                      <Text className="text-[32px]">{b.icone}</Text>
                      <Text className="mt-2 text-center text-[11px] text-foreground">{b.nome}</Text>
                      {!u && <Lock size={12} color="#64748B" style={{ position: "absolute", top: 6, right: 6 }} />}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* Settings Modal */}
      <Modal visible={showSettings} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="max-h-[88%] rounded-t-3xl bg-card">
            <View className="items-center pb-2 pt-3">
              <View className="h-1.5 w-12 rounded-full bg-muted" />
            </View>
            <ScrollView className="px-4 pb-8" showsVerticalScrollIndicator={false}>
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-bold text-foreground">Configuracoes</Text>
                <TouchableOpacity onPress={() => setShowSettings(false)}>
                  <Text className="text-sm text-primary">Fechar</Text>
                </TouchableOpacity>
              </View>

              {/* Profile */}
              <View className="mt-4 rounded-2xl border border-border bg-background p-5">
                <Text className="mb-3 font-bold text-foreground">Perfil</Text>
                <Text className="mb-1.5 text-xs text-muted-foreground">Nome</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                />
                <TouchableOpacity onPress={saveProfile} className="mt-3 items-center rounded-xl bg-primary py-3">
                  <Text className="text-sm font-semibold text-primary-foreground">Salvar perfil</Text>
                </TouchableOpacity>
              </View>

              {/* Password */}
              <View className="mt-3 rounded-2xl border border-border bg-background p-5">
                <Text className="mb-3 font-bold text-foreground">Nova senha</Text>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Minimo 6 caracteres"
                  placeholderTextColor="#64748B"
                  secureTextEntry
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                />
                <TouchableOpacity onPress={updatePassword} className="mt-3 items-center rounded-xl border border-border py-3">
                  <Text className="text-sm text-foreground">Alterar senha</Text>
                </TouchableOpacity>
              </View>

              {/* Notifications */}
              <View className="mt-3 flex-row items-center justify-between rounded-2xl border border-border bg-background p-5">
                <View>
                  <Text className="font-bold text-foreground">Notificacoes</Text>
                  <Text className="text-[11px] text-muted-foreground">Lembretes e conquistas</Text>
                </View>
                <Switch
                  value={notif}
                  onValueChange={(v) => {
                    setNotif(v);
                    supabase.from("profiles").update({ notificacoes_ativas: v }).eq("id", profile.id).then(() => refreshProfile());
                  }}
                  trackColor={{ false: "#E2E8F0", true: "#7C3AED" }}
                />
              </View>

              {/* Restricoes */}
              <View className="mt-3 rounded-2xl border border-border bg-background p-5">
                <Text className="mb-3 font-bold text-foreground">Restricoes alimentares</Text>
                <View className="flex-row flex-wrap gap-2">
                  {RESTRICOES.map((r) => (
                    <TouchableOpacity
                      key={r}
                      onPress={() => toggleRestricao(r)}
                      className={`rounded-lg border px-3 py-2 ${
                        restricoes.includes(r) ? "border-primary bg-primary/10" : "border-border bg-card"
                      }`}
                    >
                      <Text className={`text-sm capitalize ${restricoes.includes(r) ? "text-primary" : "text-foreground"}`}>
                        {restricoes.includes(r) ? "✓ " : ""}{r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity onPress={saveProfile} className="mt-3 items-center rounded-xl bg-primary py-3">
                  <Text className="text-sm font-semibold text-primary-foreground">Salvar restricoes</Text>
                </TouchableOpacity>
              </View>

              {/* Weight */}
              <View className="mt-3 rounded-2xl border border-border bg-background p-5">
                <Text className="mb-3 font-bold text-foreground">Atualizar peso</Text>
                <View className="flex-row gap-2">
                  <TextInput
                    value={newPeso}
                    onChangeText={setNewPeso}
                    placeholder="Peso atual em kg"
                    placeholderTextColor="#64748B"
                    keyboardType="decimal-pad"
                    className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                  />
                  <TouchableOpacity onPress={logPeso} className="items-center justify-center rounded-xl bg-primary px-4">
                    <Text className="text-sm font-semibold text-primary-foreground">Registrar</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Logout */}
              <TouchableOpacity onPress={handleLogout} className="mt-4 mb-8 flex-row items-center justify-center gap-2 py-3">
                <LogOut size={16} color="#EF4444" />
                <Text className="text-sm text-destructive">Sair da conta</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
