import { useEffect, useState, useCallback } from "react";
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
  Share,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, RouteProp, useFocusEffect, useNavigation } from "@react-navigation/native";
import { Heart, MessageCircle, Send, X, ImagePlus, BadgeCheck } from "lucide-react-native";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { showToast } from "@/lib/toast";
import * as ImagePicker from "expo-image-picker";
import type { MainTabParamList } from "@/navigation/types";

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
  const route = useRoute<RouteProp<MainTabParamList, "Comunidade">>();
  const [posts, setPosts] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  const [text, setText] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"recentes" | "antigos" | "curtidos">("recentes");

  // Comment state
  const [commentModalPostId, setCommentModalPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

  const load = async () => {
    const { data, error: postsErr } = await supabase
      .from("posts_comunidade")
      .select("*, profiles(full_name, avatar_url, is_verified, is_admin), reacoes_posts(tipo, user_id)")
      .eq("removido", false)
      .order("fixado", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    if (postsErr) console.log("[COMUNIDADE] posts_comunidade error:", postsErr.message, postsErr.code);
    const loadedPosts = data ?? [];
    setPosts(loadedPosts);
    setLoading(false);

    // Load comment counts for all posts
    if (loadedPosts.length > 0) {
      const postIds = loadedPosts.map((p: any) => p.id);
      const { data: countData, error: countErr } = await (supabase
        .from("comentarios_posts") as any)
        .select("post_id")
        .in("post_id", postIds);
      if (countErr) console.log("[COMUNIDADE] comentarios_posts count error:", countErr.message, countErr.code);
      if (countData) {
        const counts: Record<string, number> = {};
        (countData as any[]).forEach((c: any) => {
          counts[c.post_id] = (counts[c.post_id] || 0) + 1;
        });
        setCommentCounts(counts);
      }
    }
  };

  useEffect(() => { load(); }, []);

  const nav = useNavigation();
  useFocusEffect(
    useCallback(() => {
      if (route.params?.openPost) {
        setShow(true);
        nav.setParams({ openPost: false } as any);
      }
    }, [route.params?.openPost])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

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
    if (!text.trim() || !profile || busy) return;
    setBusy(true);
    let imgUrl: string | null = null;
    if (imageUri) {
      const path = `${profile.id}/${Date.now()}.jpg`;
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const { error: upErr } = await supabase.storage.from("community-posts").upload(path, blob, {
        contentType: "image/jpeg",
        upsert: true,
      });
      if (upErr) {
        console.log("[COMUNIDADE] storage community-posts upload error:", upErr.message);
        setBusy(false);
        showToast("error", "Erro ao enviar foto: " + upErr.message);
        return;
      }
      const { data: pub } = supabase.storage.from("community-posts").getPublicUrl(path);
      imgUrl = pub.publicUrl;
    }
    const { error } = await supabase.from("posts_comunidade").insert({
      user_id: profile.id,
      texto: text.trim().slice(0, 280),
      imagem_url: imgUrl,
    });
    setBusy(false);
    if (error) { console.log("[COMUNIDADE] posts_comunidade insert error:", error.message, error.code); return showToast("error", error.message); }
    showToast("success", "Post compartilhado! +5 XP");
    setText("");
    setImageUri(null);
    setShow(false);
    load();
  };

  const toggleLike = async (postId: string) => {
    if (!profile) return;
    const post = posts.find((p) => p.id === postId);
    const mine = post?.reacoes_posts?.find((r: any) => r.user_id === profile.id && r.tipo === "coracao");
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const reacoes = p.reacoes_posts ?? [];
        if (mine) {
          return { ...p, reacoes_posts: reacoes.filter((r: any) => !(r.user_id === profile.id && r.tipo === "coracao")) };
        }
        return { ...p, reacoes_posts: [...reacoes, { user_id: profile.id, tipo: "coracao" }] };
      })
    );
    // Fire and forget
    if (mine) {
      supabase.from("reacoes_posts").delete().eq("post_id", postId).eq("user_id", profile.id).eq("tipo", "coracao").then(({ error: delErr }) => { if (delErr) console.log("[COMUNIDADE] reacoes_posts delete error:", delErr.message, delErr.code); });
    } else {
      supabase.from("reacoes_posts").upsert({ post_id: postId, user_id: profile.id, tipo: "coracao" }, { onConflict: "post_id,user_id" }).then(({ error: upsErr }) => { if (upsErr) console.log("[COMUNIDADE] reacoes_posts upsert error:", upsErr.message, upsErr.code); });
    }
  };

  // --- Comments ---

  const openComments = async (postId: string) => {
    setCommentModalPostId(postId);
    setCommentText("");
    setLoadingComments(true);
    const { data, error: loadErr } = await (supabase
      .from("comentarios_posts") as any)
      .select("*, profiles(full_name, is_verified, is_admin)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    console.log("[COMMENT] load:", JSON.stringify({ data, error: loadErr }));
    setComments(data ?? []);
    setLoadingComments(false);
  };

  const submitComment = async () => {
    if (!commentText.trim() || !profile || !commentModalPostId || sendingComment) return;
    setSendingComment(true);
    const { data: insertData, error } = await (supabase
      .from("comentarios_posts") as any)
      .insert({
        post_id: commentModalPostId,
        user_id: profile.id,
        texto: commentText.trim(),
      })
      .select();
    console.log("[COMMENT] insert result:", JSON.stringify({ insertData, error }));
    setSendingComment(false);
    if (error) {
      console.log("[COMMENT] error:", error.message, error.details, error.hint, error.code);
      return showToast("error", error.message);
    }
    setCommentText("");
    // Reload comments
    const { data, error: reloadErr } = await (supabase
      .from("comentarios_posts") as any)
      .select("*, profiles(full_name, is_verified, is_admin)")
      .eq("post_id", commentModalPostId)
      .order("created_at", { ascending: true });
    if (reloadErr) console.log("[COMUNIDADE] comentarios_posts reload error:", reloadErr.message, reloadErr.code);
    setComments(data ?? []);
    // Update count
    setCommentCounts((prev) => ({
      ...prev,
      [commentModalPostId]: (data ?? []).length,
    }));
  };

  // --- Share ---

  const sharePost = async (postText: string) => {
    try {
      await Share.share({ message: postText });
    } catch {
      // user cancelled
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#BFDB1E" />}>
        <View className="px-4 pb-4 pt-6">
          <Text className="text-[26px] font-bold leading-tight text-foreground">
            Comunidade
          </Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            Suporte de quem está com você
          </Text>

          {/* Filtros */}
          <View className="mt-3 flex-row gap-2">
            <TouchableOpacity
              onPress={() => setFilter("recentes")}
              activeOpacity={0.9}
              className={`rounded-full px-4 py-2 ${filter === "recentes" ? "bg-primary" : "bg-muted"}`}
            >
              <Text className={`text-sm font-medium ${filter === "recentes" ? "text-primary-foreground" : "text-muted-foreground"}`}>
                Recentes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilter("antigos")}
              activeOpacity={0.9}
              className={`rounded-full px-4 py-2 ${filter === "antigos" ? "bg-primary" : "bg-muted"}`}
            >
              <Text className={`text-sm font-medium ${filter === "antigos" ? "text-primary-foreground" : "text-muted-foreground"}`}>
                Mais antigos
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilter("curtidos")}
              activeOpacity={0.9}
              className={`rounded-full px-4 py-2 ${filter === "curtidos" ? "bg-primary" : "bg-muted"}`}
            >
              <Text className={`text-sm font-medium ${filter === "curtidos" ? "text-primary-foreground" : "text-muted-foreground"}`}>
                Mais curtidos
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="gap-4 px-4 pb-5">
          {loading && (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color="#BFDB1E" />
            </View>
          )}
          {!loading && posts.length === 0 && (
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

          {[...posts].sort((a, b) => {
            if (filter === "curtidos") {
              const likesA = (a.reacoes_posts ?? []).filter((r: any) => r.tipo === "coracao").length;
              const likesB = (b.reacoes_posts ?? []).filter((r: any) => r.tipo === "coracao").length;
              return likesB - likesA;
            }
            if (filter === "antigos") {
              return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            }
            return 0;
          }).map((p) => {
            const reacoes = p.reacoes_posts ?? [];
            const likes = reacoes.filter((r: any) => r.tipo === "coracao").length;
            const liked = !!reacoes.find(
              (r: any) => r.user_id === profile?.id && r.tipo === "coracao"
            );
            const nome = p.profiles?.full_name || "Aluna";
            const isVerified = p.profiles?.is_verified || p.profiles?.is_admin;
            const cCount = commentCounts[p.id] || 0;

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
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-[15px] font-bold text-foreground">{nome}</Text>
                      {isVerified && <BadgeCheck size={16} color="#fff" fill="#3B82F6" />}
                    </View>
                    <View className="mt-1 flex-row items-center gap-1.5">
                      <Heart size={14} color="#BFDB1E" fill="#BFDB1E" />
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
                    activeOpacity={1}
                    className={`h-11 w-11 items-center justify-center rounded-full border border-border`}
                  >
                    <Heart
                      size={18}
                      color={liked ? "#EF4444" : "#1A1A1A"}
                      fill={liked ? "#EF4444" : "none"}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => openComments(p.id)}
                    className="h-11 flex-row items-center justify-center gap-1 rounded-full border border-border px-3"
                  >
                    <MessageCircle size={18} color="#1A1A1A" />
                    {cCount > 0 && (
                      <Text className="text-xs text-muted-foreground">{cCount}</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => sharePost(p.texto)}
                    className="h-11 w-11 items-center justify-center rounded-full border border-border"
                  >
                    <Send size={18} color="#1A1A1A" />
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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-3xl bg-card px-5 pb-8 pt-3">
            <View className="mb-4 items-center">
              <View className="h-1.5 w-12 rounded-full bg-muted" />
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-foreground">Compartilhar</Text>
              <TouchableOpacity onPress={() => setShow(false)}>
                <X size={20} color="#1A1A1A" />
              </TouchableOpacity>
            </View>
            <TextInput
              value={text}
              onChangeText={(v) => setText(v.slice(0, 280))}
              placeholder="O que você quer dividir?"
              placeholderTextColor="#888888"
              multiline
              maxLength={280}
              className="mt-4 min-h-[100px] rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
              textAlignVertical="top"
            />
            <Text className="mt-1 text-right text-[10px] text-muted-foreground">
              {text.length}/280
            </Text>

            <TouchableOpacity onPress={pickImage} className="mt-3 flex-row items-center gap-2">
              <ImagePlus size={16} color="#888888" />
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
        </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Comments modal */}
      <Modal visible={!!commentModalPostId} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="max-h-[75%] rounded-t-3xl bg-card px-5 pb-8 pt-3">
            <View className="mb-4 items-center">
              <View className="h-1.5 w-12 rounded-full bg-muted" />
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-foreground">Comentarios</Text>
              <TouchableOpacity onPress={() => setCommentModalPostId(null)}>
                <X size={20} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            {loadingComments ? (
              <View className="items-center py-8">
                <ActivityIndicator size="small" color="#BFDB1E" />
              </View>
            ) : comments.length === 0 ? (
              <View className="items-center py-8">
                <Text className="text-sm text-muted-foreground">
                  Nenhum comentario ainda. Seja a primeira!
                </Text>
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => item.id}
                className="mt-3"
                style={{ maxHeight: 300 }}
                renderItem={({ item }) => (
                  <View className="mb-3 rounded-xl border border-border bg-background p-3">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-[13px] font-bold text-foreground">
                          {item.profiles?.full_name || "Aluna"}
                        </Text>
                        {(item.profiles?.is_verified || item.profiles?.is_admin) && <BadgeCheck size={14} color="#fff" fill="#3B82F6" />}
                      </View>
                      <Text className="text-[10px] text-muted-foreground">
                        {formatRelative(item.created_at)}
                      </Text>
                    </View>
                    <Text className="mt-1 text-[13px] leading-relaxed text-foreground">
                      {item.texto}
                    </Text>
                  </View>
                )}
              />
            )}

            {/* Comment input */}
            <View className="mt-3 flex-row items-center gap-2">
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Escreva um comentario..."
                placeholderTextColor="#888888"
                maxLength={500}
                className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
              />
              <TouchableOpacity
                onPress={submitComment}
                disabled={sendingComment || !commentText.trim()}
                className={`h-11 w-11 items-center justify-center rounded-full bg-primary ${
                  sendingComment || !commentText.trim() ? "opacity-50" : ""
                }`}
              >
                {sendingComment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Send size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
