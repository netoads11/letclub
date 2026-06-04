import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { ChevronLeft, Play, Pause, Headphones } from "lucide-react-native";
import { Audio } from "expo-av";
import { supabase } from "@/integrations/supabase/client";

type AudioItem = {
  id: string;
  titulo: string;
  descricao: string;
  audio_url: string;
  capa_url: string | null;
  duracao_segundos: number | null;
  ordem: number;
};

const formatTime = (sec: number) => {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

export default function AudiosScreen() {
  const nav = useNavigation();
  const [items, setItems] = useState<AudioItem[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, { cur: number; dur: number }>>({});
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    (async () => {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });
      const { data, error: audErr } = await (supabase as any)
        .from("audios_diarios")
        .select("*")
        .eq("ativo", true)
        .order("ordem")
        .order("created_at", { ascending: false });
      if (audErr) console.log("[AUDIOS] audios_diarios error:", audErr.message, audErr.code);
      setItems((data ?? []) as AudioItem[]);
    })();
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const togglePlay = async (a: AudioItem) => {
    if (playingId === a.id) {
      await soundRef.current?.pauseAsync();
      setPlayingId(null);
      return;
    }

    await soundRef.current?.unloadAsync();
    const { sound } = await Audio.Sound.createAsync(
      { uri: a.audio_url },
      { shouldPlay: true },
      (status) => {
        if (status.isLoaded) {
          setProgress((p) => ({
            ...p,
            [a.id]: {
              cur: (status.positionMillis ?? 0) / 1000,
              dur: (status.durationMillis ?? (a.duracao_segundos ?? 0) * 1000) / 1000,
            },
          }));
          if (status.didJustFinish) {
            setPlayingId(null);
          }
        }
      }
    );
    soundRef.current = sound;
    setPlayingId(a.id);
  };

  const seek = async (id: string, pct: number) => {
    if (playingId !== id || !soundRef.current) return;
    const dur = progress[id]?.dur ?? 0;
    if (dur) {
      await soundRef.current.setPositionAsync(dur * pct * 1000);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-2 px-4 pb-4 pt-6">
          <TouchableOpacity onPress={() => nav.goBack()} className="-ml-1 p-1">
            <ChevronLeft size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <View>
            <Text className="text-[11px] uppercase tracking-widest text-primary">
              Podcast da Let
            </Text>
            <Text className="mt-0.5 text-[26px] font-bold text-foreground">
              Áudios diários
            </Text>
          </View>
        </View>

        <View className="px-4 pb-6">
          <View className="mb-4 flex-row items-center gap-3 rounded-2xl border border-border bg-primary/10 p-4">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-primary">
              <Headphones size={20} color="#fff" />
            </View>
            <Text className="flex-1 text-[13px] leading-snug text-foreground">
              Curtos, diretos e cheios de afeto. Escute quando precisar de um empurrão.
            </Text>
          </View>

          {items.length === 0 ? (
            <View className="items-center rounded-2xl border border-border bg-card p-8">
              <Text className="text-center text-sm text-muted-foreground">
                Nenhum áudio publicado ainda. Volte em breve.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {items.map((a, i) => {
                const isPlaying = playingId === a.id;
                const pr = progress[a.id];
                const dur = pr?.dur || a.duracao_segundos || 0;
                const cur = pr?.cur || 0;
                const pct = dur ? (cur / dur) * 100 : 0;
                return (
                  <View key={a.id} className="rounded-2xl border border-border bg-card p-4">
                    <View className="flex-row items-start gap-3">
                      <View className="h-16 w-16 overflow-hidden rounded-2xl bg-muted">
                        {a.capa_url ? (
                          <Image source={{ uri: a.capa_url }} className="h-full w-full" resizeMode="cover" />
                        ) : (
                          <View className="h-full w-full items-center justify-center bg-secondary">
                            <Headphones size={24} color="#fff" />
                          </View>
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          Episódio {String(i + 1).padStart(2, "0")}
                        </Text>
                        <Text className="mt-0.5 text-[16px] font-bold leading-tight text-foreground">
                          {a.titulo}
                        </Text>
                        {a.descricao ? (
                          <Text numberOfLines={2} className="mt-1 text-[12px] leading-snug text-muted-foreground">
                            {a.descricao}
                          </Text>
                        ) : null}
                      </View>
                      <TouchableOpacity
                        onPress={() => togglePlay(a)}
                        className="h-12 w-12 items-center justify-center rounded-full bg-primary"
                        activeOpacity={0.9}
                      >
                        {isPlaying ? (
                          <Pause size={20} color="#fff" fill="#fff" />
                        ) : (
                          <Play size={20} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Progress */}
                    <View className="mt-3">
                      <TouchableOpacity
                        onPress={(e) => {
                          const x = (e as any).nativeEvent.locationX;
                          const layoutWidth = (e as any).nativeEvent.layoutX ?? 0;
                          // Use a fixed width approximation based on screen
                          e.currentTarget.measure?.((fx: number, fy: number, w: number) => {
                            if (w > 0) seek(a.id, x / w);
                          });
                          // Fallback: estimate bar width as screen width - padding
                          if (!e.currentTarget.measure) {
                            const approxWidth = 300;
                            seek(a.id, Math.min(1, Math.max(0, x / approxWidth)));
                          }
                        }}
                        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                        activeOpacity={1}
                      >
                        <View className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </TouchableOpacity>
                      <View className="mt-1.5 flex-row justify-between">
                        <Text className="text-[11px] text-muted-foreground">{formatTime(cur)}</Text>
                        <Text className="text-[11px] text-muted-foreground">{formatTime(dur)}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
