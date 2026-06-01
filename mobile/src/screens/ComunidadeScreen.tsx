import { useEffect, useState } from "react";
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
import { Heart, MessageCircle, Send, X, ImagePlus } from "lucide-react-native";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";

const formatRelative = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "Agora";
  if (min < 60) return `Ha ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Ha ${h} ${h === 1 ? "hora" : "horas"}`;
  const d = Math.floor(h / 24);
  return `Ha ${d} ${d === 1 ? "dia" : "dias"}`;
};

export default function ComunidadeScreen() {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  const [text, setText] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("posts_comunidade")
      .select("*, profiles(full_name, avatar_url), reacoes_posts(tipo, user_id)")
      .eq("removido", false)
      .order("fixado", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    setPosts(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const submit = async () => {
    if (!text.trim() || !profile) return;
    setBusy(true);
    let imgUrl: string | null = null;
    if (imageUri) {
      const path = `${profile.id}/${Date.now()}.jpg`;
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const { error: upErr } = await supabase.storage.from("community-posts").upload(path, blob);
      if (!upErr) {
        const { data: pub } = supabase.storage.from("community-posts").getPublicUrl(path);
        imgUrl = pub.publicUrl;
      }
    }
    const { error } = await supabase.from("posts_comunidade").insert({
      user_id: profile.id,
      texto: text.trim().slice(0, 280),
      imagem_url: imgUrl,
    });
    setBusy(false);
    if (error) return Toast.show({ type: "error", text1: error.message });
    Toast.show({ type: "success", text1: "Post compartilhado! +5 XP" });
    setText("");
    setImageUri(null);
    setShow(false);
    load();
  };

  const toggleLike = async (postId: string) => {
    if (!profile) return;
    const post = posts.find((p) => p.id === postId);
    const mine = post?.reacoes_posts?.find((r: any) => r.user_id === profile.id);
    if (mine?.tipo === "coracao") {
      await supabase.from("reacoes_posts").delete().eq("post_id", postId).eq("user_id", profile.id);
    } else {
      await supabase
        .from("reacoes_posts")
        .upsert({ post_id: postId, user_id: profile.id, tipo: "coracao" }, { onConflict: "post_id,user_id" });
    }
    load();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-4 pb-4 pt-6">
          <Text className="text-[26px] font-bold leading-tight text-foreground">
            Comunidade
          </Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            Suporte de quem esta com voce
          </Text>
        </View>

        <View className="gap-4 px-4 pb-5">
          {posts.length === 0 && (
            <View className="items-center py-12">
              <Text className="text-5xl">💬</Text>
              <Text className="mt-4 text-base font-medium text-foreground">
                Seja a primeira a compartilhar!
              </Text>
              <TouchableOpacity
                onPress={() => setShow(true)}
                className="mt-5 rounded-xl border border-primary px-4 py-2"
              >
                <Text className="text-sm text-primary">Criar post</Text>
              </TouchableOpacity>
            </View>
          )}

          {posts.map((p) => {
            const reacoes = p.reacoes_posts ?? [];
            const likes = reacoes.filter((r: any) => r.tipo === "coracao").length;
            const liked = !!reacoes.find(
              (r: any) => r.user_id === profile?.id && r.tipo === "coracao"
            );
            const nome = p.profiles?.full_name || "Aluna";

            return (
              <View key={p.id} className="rounded-2xl border border-border bg-card p-4">
                {/* Header */}
                <View className="flex-row items-start gap-3">
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary">
                    <Text className="text-lg font-bold text-primary-foreground">
                      {nome[0]?.toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-bold text-foreground">{nome}</Text>
                    <View className="mt-1 flex-row items-center gap-1.5">
                      <Heart size={14} color="#7C3AED" fill="#7C3AED" />
                      <Text className="text-[11px] text-muted-foreground">
                        {formatRelative(p.created_at)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Text */}
                <Text className="mt-4 text-[15px] leading-relaxed text-foreground">
                  {p.texto}
                </Text>

                {/* Image */}
                {p.imagem_url && (
                  <Image
                    source={{ uri: p.imagem_url }}
                    className="mt-3 h-48 w-full rounded-xl"
                    resizeMode="cover"
                  />
                )}

                {/* Actions */}
                <View className="mt-4 flex-row items-center gap-2">
                  <TouchableOpacity
                    onPress={() => toggleLike(p.id)}
                    className={`h-11 w-11 items-center justify-center rounded-full border border-border`}
                  >
                    <Heart
                      size={18}
                      color={liked ? "#7C3AED" : "#0F172A"}
                      fill={liked ? "#7C3AED" : "none"}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity className="h-11 w-11 items-center justify-center rounded-full border border-border">
                    <MessageCircle size={18} color="#0F172A" />
                  </TouchableOpacity>
                  <TouchableOpacity className="h-11 w-11 items-center justify-center rounded-full border border-border">
                    <Send size={18} color="#0F172A" />
                  </TouchableOpacity>
                  {likes > 0 && (
                    <Text className="ml-auto text-xs text-muted-foreground">
                      {likes} {likes === 1 ? "curtida" : "curtidas"}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => setShow(true)}
        className="absolute bottom-6 right-5 h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg"
        activeOpacity={0.9}
      >
        <Text className="text-2xl text-primary-foreground">+</Text>
      </TouchableOpacity>

      {/* New post modal */}
      <Modal visible={show} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-3xl bg-card px-5 pb-8 pt-3">
            <View className="mb-4 items-center">
              <View className="h-1.5 w-12 rounded-full bg-muted" />
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-foreground">Compartilhar</Text>
              <TouchableOpacity onPress={() => setShow(false)}>
                <X size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>
            <TextInput
              value={text}
              onChangeText={(v) => setText(v.slice(0, 280))}
              placeholder="O que voce quer dividir?"
              placeholderTextColor="#64748B"
              multiline
              maxLength={280}
              className="mt-4 min-h-[100px] rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
              textAlignVertical="top"
            />
            <Text className="mt-1 text-right text-[10px] text-muted-foreground">
              {text.length}/280
            </Text>

            <TouchableOpacity onPress={pickImage} className="mt-3 flex-row items-center gap-2">
              <ImagePlus size={16} color="#64748B" />
              <Text className="text-xs text-muted-foreground">
                {imageUri ? "Foto selecionada" : "Adicionar foto (opcional)"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={submit}
              disabled={busy || !text.trim()}
              className={`mt-4 items-center rounded-xl bg-primary py-3.5 ${
                busy || !text.trim() ? "opacity-50" : ""
              }`}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-sm font-semibold text-primary-foreground">
                  Compartilhar
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
