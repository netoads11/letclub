import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Heart, Sparkles, Bell } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import Toast from "react-native-toast-message";

const dificuldades = [
  { v: "inchaco", l: "Inchaco" },
  { v: "intestino", l: "Intestino preso" },
  { v: "energia", l: "Falta de energia" },
  { v: "emagrecimento", l: "Emagrecimento" },
  { v: "outro", l: "Outro" },
];

export default function OnboardingScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");
  const [meta, setMeta] = useState("");
  const [dif, setDif] = useState("emagrecimento");
  const [busy, setBusy] = useState(false);

  const finish = async (notif: boolean) => {
    if (!user) return;
    setBusy(true);
    const pesoN = parseFloat(peso);
    const alturaN = parseFloat(altura);
    const metaN = parseFloat(meta);
    if (!pesoN || !alturaN || !metaN) {
      Toast.show({ type: "error", text1: "Preencha todos os campos" });
      setStep(1);
      setBusy(false);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        peso_inicial: pesoN,
        peso_atual: pesoN,
        altura: alturaN,
        meta_peso: metaN,
        principal_dificuldade: dif as any,
        onboarding_completed: true,
        challenge_start_date: new Date().toISOString().slice(0, 10),
        notificacoes_ativas: notif,
      })
      .eq("id", user.id);

    await supabase.from("pesos_historico").insert({
      user_id: user.id,
      peso: pesoN,
      registrado_em: new Date().toISOString().slice(0, 10),
    });

    setBusy(false);
    if (error) return Toast.show({ type: "error", text1: error.message });
    await refreshProfile();
    Toast.show({ type: "success", text1: "Tudo certo! Bora comecar!" });
  };

  const firstName = (profile?.full_name || "").split(" ")[0] || "linda";

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="px-6"
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress dots */}
        <View className="mb-8 mt-10 flex-row items-center justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              className={`h-1.5 rounded-full ${
                i === step ? "w-8 bg-primary" : "w-2 bg-muted"
              }`}
            />
          ))}
        </View>

        {step === 0 && (
          <View className="flex-1 items-center justify-center">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-primary/15">
              <Heart size={48} color="#7C3AED" />
            </View>
            <Text className="mt-6 text-center text-3xl font-bold text-foreground">
              Bem-vinda, {firstName}!
            </Text>
            <Text className="mt-3 max-w-[280px] text-center text-sm text-muted-foreground">
              Sou a Let. Nos proximos 15 dias, vou te guiar em uma jornada de
              habitos saudaveis, energia e autocuidado. Vamos juntas?
            </Text>
            <TouchableOpacity
              onPress={() => setStep(1)}
              className="mt-10 w-full items-center rounded-xl bg-primary py-3.5"
            >
              <Text className="text-sm font-semibold text-primary-foreground">
                Comecar minha jornada
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 1 && (
          <View className="flex-1">
            <Sparkles size={32} color="#7C3AED" />
            <Text className="mt-3 text-2xl font-bold text-foreground">
              Conta um pouco sobre voce
            </Text>
            <Text className="mt-1 text-sm text-muted-foreground">
              Esses dados ajudam a personalizar seu desafio.
            </Text>

            <View className="mt-6 gap-4">
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="mb-1.5 text-sm font-medium text-foreground">
                    Peso atual (kg)
                  </Text>
                  <TextInput
                    value={peso}
                    onChangeText={setPeso}
                    placeholder="65.5"
                    placeholderTextColor="#64748B"
                    keyboardType="decimal-pad"
                    className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                  />
                </View>
                <View className="flex-1">
                  <Text className="mb-1.5 text-sm font-medium text-foreground">
                    Altura (cm)
                  </Text>
                  <TextInput
                    value={altura}
                    onChangeText={setAltura}
                    placeholder="165"
                    placeholderTextColor="#64748B"
                    keyboardType="number-pad"
                    className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                  />
                </View>
              </View>

              <View>
                <Text className="mb-1.5 text-sm font-medium text-foreground">
                  Meta de peso (kg)
                </Text>
                <TextInput
                  value={meta}
                  onChangeText={setMeta}
                  placeholder="60"
                  placeholderTextColor="#64748B"
                  keyboardType="decimal-pad"
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                />
              </View>

              <View>
                <Text className="mb-1.5 text-sm font-medium text-foreground">
                  Sua principal dificuldade hoje
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {dificuldades.map((d) => (
                    <TouchableOpacity
                      key={d.v}
                      onPress={() => setDif(d.v)}
                      className={`rounded-xl border p-3 ${
                        dif === d.v
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card"
                      }`}
                      style={{ width: "48%" }}
                    >
                      <Text
                        className={`text-sm ${
                          dif === d.v ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {d.l}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setStep(2)}
              disabled={!peso || !altura || !meta}
              className={`mt-8 items-center rounded-xl bg-primary py-3.5 ${
                !peso || !altura || !meta ? "opacity-50" : ""
              }`}
            >
              <Text className="text-sm font-semibold text-primary-foreground">
                Continuar
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View className="flex-1 items-center justify-center">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-primary/15">
              <Bell size={48} color="#7C3AED" />
            </View>
            <Text className="mt-6 text-center text-2xl font-bold text-foreground">
              Quer receber lembretes diarios?
            </Text>
            <Text className="mt-3 max-w-[280px] text-center text-sm text-muted-foreground">
              Vou te lembrar das missoes, cha da noite e conquistas. Voce pode
              mudar isso depois.
            </Text>
            <View className="mt-10 w-full gap-3">
              <TouchableOpacity
                onPress={() => finish(true)}
                disabled={busy}
                className={`items-center rounded-xl bg-primary py-3.5 ${
                  busy ? "opacity-50" : ""
                }`}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-sm font-semibold text-primary-foreground">
                    Ativar notificacoes
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => finish(false)}
                disabled={busy}
                className="items-center rounded-xl py-3.5"
              >
                <Text className="text-sm text-muted-foreground">
                  Agora nao
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
